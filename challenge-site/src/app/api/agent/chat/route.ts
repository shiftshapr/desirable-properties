import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { hermesUpstreamHeaders } from '@/lib/hermes-proxy';
import { getHermesChatUrl } from '@/lib/web3auth-config';

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
        surface: body.surface || 'desirableproperties.org/agent',
        sessionId: body.sessionId || null,
        threadId: body.threadId || null,
        verifierId: session.verifierId,
        displayName: session.displayName || null,
        govHubUserId: session.userId,
        documents: body.documents || [],
      }),
      signal: AbortSignal.timeout(120000),
    });

    const raw = await upstream.text();
    let data: { error?: string; response?: string } = {};
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
        { error: data.error || 'Hermes unavailable' },
        { status: upstream.status },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Chat request failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
