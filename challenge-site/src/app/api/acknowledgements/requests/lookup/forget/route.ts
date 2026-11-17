import { NextResponse } from 'next/server';
import { NO_STORE, clearViewCookie } from '@/lib/ack-request-access';

/** Stop showing the requests opened with an emailed link on this device. */
export async function POST() {
  const res = NextResponse.json({ ok: true }, { headers: NO_STORE });
  clearViewCookie(res);
  return res;
}
