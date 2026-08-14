import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { hermesUpstreamHeaders } from '@/lib/hermes-proxy';
import { getHermesChatUrl } from '@/lib/web3auth-config';

export async function POST(request: Request) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Sign in required to stage' }, { status: 401 });
  }

  const body = await request.json();
  const upstream = await fetch(`${getHermesChatUrl()}/api/hermes/contributions/stage`, {
    method: 'POST',
    headers: hermesUpstreamHeaders(),
    body: JSON.stringify({
      ...body,
      idToken: session.idToken,
      verifierId: session.verifierId,
    }),
    signal: AbortSignal.timeout(60000),
  });
  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}
