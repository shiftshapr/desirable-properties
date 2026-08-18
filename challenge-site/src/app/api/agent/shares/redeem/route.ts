import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { hermesUpstreamHeaders } from '@/lib/hermes-proxy';
import { getHermesChatUrl } from '@/lib/web3auth-config';

export async function POST(request: Request) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  if (!body.linkToken) {
    return NextResponse.json({ error: 'linkToken required' }, { status: 400 });
  }

  const upstream = await fetch(`${getHermesChatUrl()}/api/hermes/shares/redeem`, {
    method: 'POST',
    headers: hermesUpstreamHeaders(),
    body: JSON.stringify({
      verifierId: session.verifierId,
      linkToken: body.linkToken,
      displayName: session.displayName,
      govHubUserId: session.userId,
    }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}
