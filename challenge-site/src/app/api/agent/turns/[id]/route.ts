import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { hermesUpstreamHeaders } from '@/lib/hermes-proxy';
import { getHermesChatUrl } from '@/lib/web3auth-config';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const upstream = await fetch(`${getHermesChatUrl()}/api/hermes/turns/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: hermesUpstreamHeaders(),
    body: JSON.stringify({
      verifierId: session.verifierId,
      assistantMessage: body.assistantMessage,
      citedDps: body.citedDps || [],
      contributionHint: body.contributionHint || null,
    }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}
