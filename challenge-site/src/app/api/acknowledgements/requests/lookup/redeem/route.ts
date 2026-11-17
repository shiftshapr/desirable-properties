import { NextResponse } from 'next/server';
import {
  NO_STORE,
  isJsonRequest,
  UPSTREAM_DOWN,
  cleanViewToken,
  govhubAck,
  setViewCookie,
  upstreamJson,
} from '@/lib/ack-request-access';

/**
 * Use the one-time link from the lookup email ({token}, read by the page from the link's #fragment
 * and posted here after the person clicks, so mail scanners that open links do not use it up).
 * Gov Hub accepts it once, within a day, and returns a view token, which is kept in an httpOnly
 * cookie for a couple of hours. The token itself is never returned to the browser.
 */
export async function POST(request: Request) {
  if (!isJsonRequest(request)) {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 415, headers: NO_STORE });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400, headers: NO_STORE });
  }
  const token = String((body as Record<string, unknown> | null)?.token ?? '').slice(0, 200);
  try {
    const res = await govhubAck('lookup/redeem/', { body: { token } });
    const data = await upstreamJson(res);
    if (!data) return NextResponse.json({ ok: false, error: 'upstream', message: UPSTREAM_DOWN }, { status: 502, headers: NO_STORE });
    const view = cleanViewToken(typeof data.view_token === 'string' ? data.view_token : null);
    if (!res.ok || !data.ok || !view) {
      return NextResponse.json(
        { ok: false, error: data.error || 'link_expired', message: data.message },
        { status: res.status >= 400 ? res.status : 410, headers: NO_STORE },
      );
    }
    const out = NextResponse.json({ ok: true, expires_at: data.expires_at }, { headers: NO_STORE });
    setViewCookie(out, view, Number(data.expires_in) || 7200);
    return out;
  } catch {
    return NextResponse.json({ ok: false, error: 'upstream', message: UPSTREAM_DOWN }, { status: 504, headers: NO_STORE });
  }
}
