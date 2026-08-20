import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { hermesUpstreamHeaders } from '@/lib/hermes-proxy';
import { getHermesChatUrl } from '@/lib/web3auth-config';

export async function GET(request: Request) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const archived = searchParams.get('archived');
  const archivedQuery = archived === '1' || archived === 'true' ? '&archived=true' : '';

  const upstream = await fetch(
    `${getHermesChatUrl()}/api/hermes/threads?verifierId=${encodeURIComponent(session.verifierId)}${archivedQuery}`,
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
      threadKind: body.threadKind || body.thread_kind || 'private',
      groupTitle: body.groupTitle || body.group_title || undefined,
    }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}
