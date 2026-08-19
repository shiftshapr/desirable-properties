import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { hermesUpstreamHeaders } from '@/lib/hermes-proxy';
import { getHermesChatUrl } from '@/lib/web3auth-config';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const { id } = await params;
  const upstream = await fetch(
    `${getHermesChatUrl()}/api/hermes/threads/${encodeURIComponent(id)}/control/accept`,
    {
      method: 'POST',
      headers: hermesUpstreamHeaders(),
      body: JSON.stringify({ verifierId: session.verifierId }),
      signal: AbortSignal.timeout(15000),
    },
  );
  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}
