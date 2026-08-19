import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { hermesUpstreamHeaders } from '@/lib/hermes-proxy';
import { getHermesChatUrl } from '@/lib/web3auth-config';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const { id } = await params;
  const upstream = await fetch(
    `${getHermesChatUrl()}/api/hermes/threads/${encodeURIComponent(id)}?verifierId=${encodeURIComponent(session.verifierId)}`,
    { headers: hermesUpstreamHeaders(), signal: AbortSignal.timeout(15000) },
  );
  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const upstream = await fetch(`${getHermesChatUrl()}/api/hermes/threads/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: hermesUpstreamHeaders(),
    body: JSON.stringify({
      verifierId: session.verifierId,
      title: body.title,
      pinned: body.pinned,
      archived: body.archived,
    }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const { id } = await params;
  const upstream = await fetch(
    `${getHermesChatUrl()}/api/hermes/threads/${encodeURIComponent(id)}?verifierId=${encodeURIComponent(session.verifierId)}`,
    {
      method: 'DELETE',
      headers: hermesUpstreamHeaders(),
      signal: AbortSignal.timeout(15000),
    },
  );
  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}
