import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import {
  fetchCommunityMessagesServer,
  postCommunityMessageServer,
} from '@/lib/community-messages.server';
import { fetchCommunityThreadAccessServer } from '@/lib/community-thread-access.server';
import { normalizeHermesThreadId } from '@/lib/hermes-community-collab';

type RouteCtx = { params: Promise<{ threadId: string }> };

export async function GET(request: Request, ctx: RouteCtx) {
  const { threadId: rawThreadId } = await ctx.params;
  const threadId = normalizeHermesThreadId(rawThreadId);
  if (!threadId) {
    return NextResponse.json({ error: 'thread id required' }, { status: 400 });
  }

  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const url = new URL(request.url);
  const fullParam = url.searchParams.get('full')?.toLowerCase() ?? '';
  const full = fullParam === '1' || fullParam === 'true' || fullParam === 'yes';

  const access = await fetchCommunityThreadAccessServer(threadId, session);
  if (!access?.canRead) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const payload = await fetchCommunityMessagesServer(threadId, { session, full });
  if (!payload.configured) {
    return NextResponse.json({ error: 'Community chat database not configured' }, { status: 503 });
  }

  return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request, ctx: RouteCtx) {
  const { threadId: rawThreadId } = await ctx.params;
  const threadId = normalizeHermesThreadId(rawThreadId);
  if (!threadId) {
    return NextResponse.json({ error: 'thread id required' }, { status: 400 });
  }

  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as { body?: string };
  const result = await postCommunityMessageServer(threadId, String(body.body || ''), session);
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ success: true, message: result.message });
}
