import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { hermesUpstreamHeaders } from '@/lib/hermes-proxy';
import { getHermesChatUrl } from '@/lib/web3auth-config';

export async function POST(request: Request) {
  try {
    const session = await readSession();
    if (!session) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const body = await request.json();
    const upstream = await fetch(`${getHermesChatUrl()}/api/hermes/community-notes`, {
      method: 'POST',
      headers: hermesUpstreamHeaders(),
      body: JSON.stringify({
        text: body.text,
        dpIds: body.dpIds || [],
        threadId: body.threadId || null,
        verifierId: session.verifierId,
      }),
      signal: AbortSignal.timeout(30000),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      return NextResponse.json(
        { error: data.error || 'Could not save correction' },
        { status: upstream.status },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Save correction failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
