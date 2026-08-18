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
    `${getHermesChatUrl()}/api/hermes/threads/${encodeURIComponent(id)}/shares?verifierId=${encodeURIComponent(session.verifierId)}`,
    { headers: hermesUpstreamHeaders(), signal: AbortSignal.timeout(15000) },
  );
  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const upstream = await fetch(
    `${getHermesChatUrl()}/api/hermes/threads/${encodeURIComponent(id)}/shares`,
    {
      method: 'POST',
      headers: hermesUpstreamHeaders(),
      body: JSON.stringify({
        verifierId: session.verifierId,
        sendeeRole: body.sendeeRole || 'watcher',
        visibility: body.visibility || 'full',
        senderRetainsWatch: body.senderRetainsWatch !== false,
        expiresInHours: body.expiresInHours ?? 24,
        anchorTurnId: body.anchorTurnId || undefined,
        recipientEmail: body.recipientEmail || undefined,
      }),
      signal: AbortSignal.timeout(15000),
    },
  );
  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}
