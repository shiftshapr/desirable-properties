import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, parseAdminSession } from '@/lib/onchainAdminAuth';
import { hermesUpstreamHeaders } from '@/lib/hermes-proxy';
import { getHermesChatUrl } from '@/lib/web3auth-config';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const email = await parseAdminSession(cookieStore.get(ADMIN_COOKIE)?.value);
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'suggestion';
  const limit = searchParams.get('limit') || '50';

  try {
    const upstream = await fetch(
      `${getHermesChatUrl()}/api/hermes/community-notes?status=${encodeURIComponent(status)}&limit=${encodeURIComponent(limit)}`,
      {
        headers: {
          ...hermesUpstreamHeaders(),
          'X-Hermes-Admin-Email': email,
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
