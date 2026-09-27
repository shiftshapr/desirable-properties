import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { hermesUpstreamHeaders } from '@/lib/hermes-proxy';
import { getHermesChatUrl } from '@/lib/web3auth-config';
import { DP_COMMUNITY_AI_REALM } from '@/lib/dp-community-ai';

/** Proxy: 2–3 perspective comment drafts from the last turn or whole thread (spec §G). */
export async function POST(request: Request) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  try {
    const upstream = await fetch(`${getHermesChatUrl()}/api/hermes/comments/drafts`, {
      method: 'POST',
      headers: hermesUpstreamHeaders(),
      body: JSON.stringify({
        scope: body.scope === 'thread' ? 'thread' : 'turn',
        turns: Array.isArray(body.turns) ? body.turns.slice(-16) : [],
        target: body.target ?? null,
        dpFocus: body.dpFocus ?? null,
        realm: DP_COMMUNITY_AI_REALM,
        surface: 'desirableproperties.org/agent#comment',
      }),
      signal: AbortSignal.timeout(125000),
    });
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.ok ? 200 : upstream.status || 502 });
  } catch (err) {
    const timeout = err instanceof Error && err.name === 'TimeoutError';
    return NextResponse.json({ error: timeout ? 'Drafting timed out, try again' : 'Deepi unavailable' }, { status: timeout ? 504 : 502 });
  }
}
