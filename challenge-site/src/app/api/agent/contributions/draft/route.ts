import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { hermesUpstreamHeaders } from '@/lib/hermes-proxy';
import { getHermesChatUrl } from '@/lib/web3auth-config';

export async function POST(request: Request) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Sign in required to draft contributions' }, { status: 401 });
  }

  const body = await request.json();
  const upstream = await fetch(`${getHermesChatUrl()}/api/hermes/contributions/draft`, {
    method: 'POST',
    headers: hermesUpstreamHeaders(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(95000),
  });
  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}
