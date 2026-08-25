import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { searchCanopiUsersServer } from '@/lib/dp-canopi-user-search';

export async function GET(request: Request) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim();
  if (q.length < 2) {
    return NextResponse.json({ ok: true, users: [], count: 0 });
  }

  if (!process.env.METAWEB_OPS_SECRET?.trim()) {
    return NextResponse.json({ error: 'Canopi search is not configured' }, { status: 503 });
  }

  try {
    const users = await searchCanopiUsersServer(q, 20);
    return NextResponse.json({ ok: true, users, count: users.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Canopi search failed';
    if (/unauthorized|mismatch/i.test(message)) {
      return NextResponse.json({ error: 'Canopi member search is misconfigured' }, { status: 503 });
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
