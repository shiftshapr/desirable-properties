import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { DP_COMMUNITY_AI_ERRORS, DP_COMMUNITY_AI_REALM } from '@/lib/dp-community-ai';
import { hermesUpstreamHeaders } from '@/lib/hermes-proxy';
import { getHermesChatUrl } from '@/lib/web3auth-config';

function chatUpstreamSignal(clientSignal: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(120000);
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([clientSignal, timeout]);
  }
  return clientSignal;
}

export async function POST(request: Request) {
  try {
    const session = await readSession();
    if (!session) {
      return NextResponse.json({ error: 'Sign in required to send messages' }, { status: 401 });
    }

    const body = await request.json();

    const headers = hermesUpstreamHeaders();
    const upstream = await fetch(`${getHermesChatUrl()}/api/dp/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: body.message,
        history: body.history || [],
        dpFocus: body.dpFocus ?? null,
        realm: body.realm || DP_COMMUNITY_AI_REALM,
        surface: body.surface || 'desirableproperties.org/agent',
        sessionId: body.sessionId || null,
        threadId: body.threadId || null,
        verifierId: session.verifierId,
        displayName: session.displayName || null,
        govHubUserId: session.userId,
        documents: body.documents || [],
        skipMemoryRecord: Boolean(body.skipMemoryRecord),
      }),
      signal: chatUpstreamSignal(request.signal),
    });

    const raw = await upstream.text();
    let data: { error?: string; response?: string } = {};
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        return NextResponse.json(
          { error: upstream.ok ? DP_COMMUNITY_AI_ERRORS.invalid_response : DP_COMMUNITY_AI_ERRORS.unavailable },
          { status: upstream.ok ? 502 : upstream.status || 502 },
        );
      }
    }
    if (!upstream.ok) {
      return NextResponse.json(
        { error: data.error || DP_COMMUNITY_AI_ERRORS.unavailable },
        { status: upstream.status },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'Aborted' }, { status: 499 });
    }
    const message = err instanceof Error ? err.message : 'Chat request failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
