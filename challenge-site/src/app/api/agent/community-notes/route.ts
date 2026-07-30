import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { hermesUpstreamHeaders } from '@/lib/hermes-proxy';
import { getHermesChatUrl } from '@/lib/web3auth-config';

export async function GET(request: Request) {
  try {
    const session = await readSession();
    if (!session) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    if (searchParams.get('mine') !== '1') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const limit = searchParams.get('limit') || '30';
    const upstream = await fetch(
      `${getHermesChatUrl()}/api/hermes/community-notes?mine=1&verifierId=${encodeURIComponent(session.verifierId)}&limit=${encodeURIComponent(limit)}`,
      {
        headers: hermesUpstreamHeaders(),
        signal: AbortSignal.timeout(30000),
      },
    );
    const data = await upstream.json();
    if (!upstream.ok) {
      return NextResponse.json(
        { error: data.error || 'Could not load your teachings' },
        { status: upstream.status },
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Load teachings failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await readSession();
    if (!session) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const body = await request.json();
    const teaching = body.correctedText || body.text;
    if (!teaching?.trim()) {
      return NextResponse.json({ error: 'correctedText required' }, { status: 400 });
    }

    const upstream = await fetch(`${getHermesChatUrl()}/api/hermes/community-notes`, {
      method: 'POST',
      headers: hermesUpstreamHeaders(),
      body: JSON.stringify({
        correctedText: teaching.trim(),
        wrongReply: body.wrongReply || null,
        userQuestion: body.userQuestion || null,
        dpIds: body.dpIds || [],
        threadId: body.threadId || null,
        verifierId: session.verifierId,
        idToken: session.idToken,
        email: session.email || null,
      }),
      signal: AbortSignal.timeout(30000),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      return NextResponse.json(
        { error: data.error || 'Could not save teaching' },
        { status: upstream.status },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Save teaching failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
