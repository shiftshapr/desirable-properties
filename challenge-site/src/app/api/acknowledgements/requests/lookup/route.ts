import { NextResponse } from 'next/server';
import { NO_STORE, isJsonRequest, UPSTREAM_DOWN, govhubAck, upstreamJson } from '@/lib/ack-request-access';

/**
 * "Look up a request": a reference code and the email used on the form. Gov Hub emails a one-time
 * link if they match and answers the same way, in the same time, if they do not; this route passes
 * that answer on unchanged (and adds no timing of its own). The browser's address goes along with
 * the Gov Hub server key so Gov Hub rate-limits the sender, not this server.
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
  const b = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const payload = {
    reference: String(b.reference ?? '').slice(0, 40),
    email: String(b.email ?? '').slice(0, 254),
  };
  try {
    const res = await govhubAck('lookup/', { body: payload, request });
    const data = await upstreamJson(res);
    if (!data) return NextResponse.json({ ok: false, error: 'upstream', message: UPSTREAM_DOWN }, { status: 502, headers: NO_STORE });
    return NextResponse.json(data, { status: res.status, headers: NO_STORE });
  } catch {
    return NextResponse.json({ ok: false, error: 'upstream', message: UPSTREAM_DOWN }, { status: 504, headers: NO_STORE });
  }
}
