import { NextResponse } from 'next/server';
import { requireDpAdminWithSession } from '@/lib/dp-admin-api';
import { hermesUpstreamHeaders } from '@/lib/hermes-proxy';
import { getHermesChatUrl } from '@/lib/web3auth-config';

export async function GET(request: Request) {
  const auth = await requireDpAdminWithSession();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'suggestion';
  const limit = searchParams.get('limit') || '50';

  try {
    const upstream = await fetch(
      `${getHermesChatUrl()}/api/hermes/community-notes?status=${encodeURIComponent(status)}&limit=${encodeURIComponent(limit)}`,
      {
        headers: {
          ...hermesUpstreamHeaders(),
          'X-Hermes-Admin-Email': auth.email,
          'X-Hermes-Id-Token': auth.session.idToken,
        },
        signal: AbortSignal.timeout(30000),
      },
    );
    const data = await upstream.json();
    if (!upstream.ok) {
      return NextResponse.json(
        { error: data.error || 'Could not load teaching queue' },
        { status: upstream.status },
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load teaching queue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
