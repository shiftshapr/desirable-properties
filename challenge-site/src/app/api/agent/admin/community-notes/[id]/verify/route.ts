import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, parseAdminSession } from '@/lib/onchainAdminAuth';
import { hermesUpstreamHeaders } from '@/lib/hermes-proxy';
import { getHermesChatUrl } from '@/lib/web3auth-config';
import { readSession } from '@/lib/auth-session';

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  const email = await parseAdminSession(cookieStore.get(ADMIN_COOKIE)?.value);
  const session = await readSession();
  if (!email || !session?.idToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'note id required' }, { status: 400 });
  }

  try {
    const upstream = await fetch(
      `${getHermesChatUrl()}/api/hermes/community-notes/${encodeURIComponent(id)}/verify`,
      {
        method: 'PATCH',
        headers: hermesUpstreamHeaders(),
        body: JSON.stringify({
          idToken: session.idToken,
          verifierId: session.verifierId,
          email: session.email || email,
        }),
        signal: AbortSignal.timeout(30000),
      },
    );
    const data = await upstream.json();
    if (!upstream.ok) {
      return NextResponse.json(
        { error: data.error || 'Could not verify teaching' },
        { status: upstream.status },
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Verify failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
