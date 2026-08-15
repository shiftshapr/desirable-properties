import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { hermesUpstreamHeaders } from '@/lib/hermes-proxy';
import { getHermesChatUrl } from '@/lib/web3auth-config';

/** Draft LLM + context can exceed chat latency — keep under nginx proxy_read_timeout (130s). */
const DRAFT_UPSTREAM_MS = 125000;

export async function POST(request: Request) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Sign in required to draft contributions' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const upstream = await fetch(`${getHermesChatUrl()}/api/hermes/contributions/draft`, {
      method: 'POST',
      headers: hermesUpstreamHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(DRAFT_UPSTREAM_MS),
    });

    const raw = await upstream.text();
    let data: { error?: string; draft?: unknown } = {};
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        return NextResponse.json(
          { error: upstream.ok ? 'Invalid response from Hermes' : 'Hermes unavailable' },
          { status: upstream.ok ? 502 : upstream.status || 502 },
        );
      }
    }

    if (!upstream.ok) {
      return NextResponse.json(
        { error: data.error || 'Could not draft contribution' },
        { status: upstream.status },
      );
    }

    if (!data.draft || typeof data.draft !== 'object') {
      return NextResponse.json(
        { error: 'Draft response was empty — try again in a moment' },
        { status: 502 },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      return NextResponse.json(
        { error: 'Draft timed out — try again or use a shorter thread scope' },
        { status: 504 },
      );
    }
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'Draft request aborted' }, { status: 499 });
    }
    const message = err instanceof Error ? err.message : 'Draft request failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
