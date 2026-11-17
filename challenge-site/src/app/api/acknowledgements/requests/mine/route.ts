import { NextResponse } from 'next/server';
import {
  NO_STORE,
  UPSTREAM_DOWN,
  clearViewCookie,
  govhubAck,
  readViewCookie,
  upstreamJson,
} from '@/lib/ack-request-access';

/**
 * The viewer's own Acknowledgements requests: sent from their account (signed in) and/or sent with
 * the email an emailed link opened (view cookie). 401 with neither. Image ids in the answer are
 * served by ./[id]/attachments/[attachmentId].
 */
export async function GET(request: Request) {
  const viewToken = readViewCookie(request);
  try {
    const res = await govhubAck('mine/', { withSession: true, viewToken });
    const data = await upstreamJson(res);
    if (!data) return NextResponse.json({ ok: false, error: 'upstream', message: UPSTREAM_DOWN }, { status: 502, headers: NO_STORE });
    const out = NextResponse.json(data, { status: res.status, headers: NO_STORE });
    if (viewToken && (data.error === 'view_expired' || data.view_expired === true)) clearViewCookie(out);
    return out;
  } catch {
    return NextResponse.json({ ok: false, error: 'upstream', message: UPSTREAM_DOWN }, { status: 504, headers: NO_STORE });
  }
}
