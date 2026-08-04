import { NextResponse } from 'next/server';
import { requireDpAdminWithSession } from '@/lib/dp-admin-api';
import { hermesUpstreamHeaders } from '@/lib/hermes-proxy';
import { getHermesChatUrl } from '@/lib/web3auth-config';

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireDpAdminWithSession();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'note id required' }, { status: 400 });
  }

  try {
    const upstream = await fetch(
      `${getHermesChatUrl()}/api/hermes/community-notes/${encodeURIComponent(id)}/reject`,
      {
        method: 'PATCH',
        headers: hermesUpstreamHeaders(),
        body: JSON.stringify({
          idToken: auth.session.idToken,
          verifierId: auth.session.verifierId,
          email: auth.session.email || auth.email,
        }),
        signal: AbortSignal.timeout(30000),
      },
    );
    const data = await upstream.json();
    if (!upstream.ok) {
      return NextResponse.json(
        { error: data.error || 'Could not reject teaching' },
        { status: upstream.status },
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Reject failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
