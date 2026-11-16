import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { listeningWorkspaceEnabled } from '@/lib/listening/flag';
import { listeningHub } from '@/lib/listening/hub.server';
import { holdStreamSlot } from '@/lib/listening/rate-limit.server';
import { getMeetingIdBySlug, readEventsAfter } from '@/lib/listening/store.server';
import type { WorkspaceEvent } from '@/lib/listening/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ slug: string }> };

const HEARTBEAT_MS = 10_000;
/** Streams are recycled; the client reconnects with its cursor (Last-Event-ID). Shorter in tests. */
const MAX_STREAM_MS = Number(process.env.LISTENING_STREAM_MAX_MS) || 15 * 60_000;

/**
 * Server-Sent Events, modelled on Canopi routes/events.js: subscribe, replay after the cursor
 * (Last-Event-ID header or ?cursor=), send `ready`, then live events. SSE id = event seq; each event
 * is sent at most once per stream and only moves forward. Heartbeat comment every 10 s.
 */
export async function GET(request: Request, ctx: RouteContext) {
  if (!listeningWorkspaceEnabled()) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const { slug } = await ctx.params;
  const meeting = await getMeetingIdBySlug(slug);
  if (!meeting) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const url = new URL(request.url);
  const raw = request.headers.get('last-event-id') || url.searchParams.get('cursor') || '';
  let cursor: number;
  if (raw === '') cursor = meeting.lastSeq;
  else if (/^\d{1,15}$/.test(raw)) cursor = Number(raw);
  else return NextResponse.json({ error: 'invalid_cursor' }, { status: 400 });

  const session = await readSession();
  const key = session?.userId
    ? `u:${session.userId}`
    : `ip:${(request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local'}`;
  const release = holdStreamSlot(key);
  if (!release) {
    return NextResponse.json({ error: 'too_many_streams' }, { status: 429, headers: { 'Retry-After': '30' } });
  }

  const encoder = new TextEncoder();
  let closed = false;
  let off: () => void = () => {};
  let hb: NodeJS.Timeout | null = null;
  let maxTimer: NodeJS.Timeout | null = null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (s: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(s));
        } catch {
          cleanup();
        }
      };
      const send = (e: WorkspaceEvent) => {
        if (e.seq <= cursor) return;
        cursor = e.seq;
        write(`id: ${e.seq}\nevent: update\ndata: ${JSON.stringify(e)}\n\n`);
      };
      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (hb) clearInterval(hb);
        if (maxTimer) clearTimeout(maxTimer);
        off();
        release();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      request.signal.addEventListener('abort', cleanup);

      write('retry: 3000\n\n');
      const queued: WorkspaceEvent[] = [];
      let replaying = true;
      try {
        off = await listeningHub.subscribe(meeting.id, cursor, (events) => {
          if (replaying) queued.push(...events);
          else events.forEach(send);
        });
        // Replay everything after the cursor, in pages.
        for (;;) {
          const page = await readEventsAfter(meeting.id, cursor, 500);
          page.forEach(send);
          if (page.length < 500) break;
        }
      } catch (err) {
        console.error('[listening] stream setup failed:', err instanceof Error ? err.message : err);
        cleanup();
        return;
      }
      replaying = false;
      queued.forEach(send);
      write(`id: ${cursor}\nevent: ready\ndata: ${JSON.stringify({ cursor })}\n\n`);
      hb = setInterval(() => write(': hb\n\n'), HEARTBEAT_MS);
      hb.unref?.();
      maxTimer = setTimeout(cleanup, MAX_STREAM_MS);
      maxTimer.unref?.();
    },
    cancel() {
      closed = true;
      if (hb) clearInterval(hb);
      if (maxTimer) clearTimeout(maxTimer);
      off();
      release();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
