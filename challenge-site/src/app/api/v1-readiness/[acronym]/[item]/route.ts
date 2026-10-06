import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { GOVHUB_PUBLIC_BASE_URL } from '@/lib/govhub';

type RouteContext = { params: Promise<{ acronym: string; item: string }> };

/** Tick or untick a manual readiness item; Gov Hub checks that the caller is a co-editor or coordinator. */
export async function POST(request: Request, ctx: RouteContext) {
  const { acronym, item } = await ctx.params;
  const session = await readSession();
  if (!session?.userId || !session.idToken) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }
  let body: { checked?: boolean; note?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }
  const res = await fetch(
    `${GOVHUB_PUBLIC_BASE_URL}/api/dp/readiness/${encodeURIComponent(acronym)}/${encodeURIComponent(item)}/`,
    {
      method: 'POST',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.idToken}`,
      },
      body: JSON.stringify({ checked: body.checked !== false, note: body.note || '' }),
    },
  );
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return NextResponse.json(data, { status: res.status });
}
