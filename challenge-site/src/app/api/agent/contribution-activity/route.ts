import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { isEmailAdmin } from '@/lib/dp-admin-auth';
import { hermesUpstreamHeaders } from '@/lib/hermes-proxy';
import { getHermesChatUrl } from '@/lib/web3auth-config';

export async function GET(request: Request) {
  const session = await readSession();
  const { searchParams } = new URL(request.url);
  const adminRequested = searchParams.get('admin') === '1';
  const scopeParam = String(searchParams.get('scope') || 'hermes').trim().toLowerCase();
  const scope = scopeParam === 'all' ? 'all' : 'hermes';

  const isAdmin =
    session && adminRequested && session.email ? await isEmailAdmin(session.email) : false;

  if (adminRequested && !isAdmin) {
    return NextResponse.json({ error: 'Admin required' }, { status: 403 });
  }

  const upstreamUrl = new URL(`${getHermesChatUrl()}/api/hermes/contribution-activity`);
  upstreamUrl.searchParams.set('scope', scope);

  const headers: Record<string, string> = { ...hermesUpstreamHeaders() };

  if (session) {
    upstreamUrl.searchParams.set('verifierId', session.verifierId);
    if (isAdmin) {
      upstreamUrl.searchParams.set('admin', '1');
      if (session.email && session.idToken) {
        headers['X-Hermes-Admin-Email'] = session.email;
        headers['X-Hermes-Id-Token'] = session.idToken;
      }
    } else {
      upstreamUrl.searchParams.set('public', '1');
    }
  } else {
    upstreamUrl.searchParams.set('public', '1');
  }

  try {
    const upstream = await fetch(upstreamUrl.toString(), {
      headers,
      signal: AbortSignal.timeout(30000),
    });
    const data = await upstream.json();
    return NextResponse.json(
      { ...data, viewerIsAdmin: isAdmin },
      { status: upstream.status },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load contribution activity';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
