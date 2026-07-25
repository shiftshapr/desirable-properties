import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { hermesUpstreamHeaders } from '@/lib/hermes-proxy';
import { getHermesChatUrl } from '@/lib/web3auth-config';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const session = await readSession();

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
        verifierId: session?.verifierId || null,
        displayName: session?.displayName || null,
        govHubUserId: session?.userId || null,
        documents: body.documents || [],
      }),
      signal: AbortSignal.timeout(95000),
    });

    const data = await upstream.json();
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
