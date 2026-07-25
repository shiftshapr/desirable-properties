import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { hermesUpstreamHeaders } from '@/lib/hermes-proxy';
import { getHermesChatUrl } from '@/lib/web3auth-config';

export async function GET() {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const upstream = await fetch(
    `${getHermesChatUrl()}/api/hermes/threads?verifierId=${encodeURIComponent(session.verifierId)}`,
    { headers: hermesUpstreamHeaders(), signal: AbortSignal.timeout(15000) },
  );
  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}

export async function POST(request: Request) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const upstream = await fetch(`${getHermesChatUrl()}/api/hermes/threads`, {
    method: 'POST',
    headers: hermesUpstreamHeaders(),
    body: JSON.stringify({
      verifierId: session.verifierId,
      govHubUserId: session.userId,
      displayName: session.displayName,
      title: body.title || 'New conversation',
      surface: body.surface || 'desirableproperties.org/agent',
    }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}
