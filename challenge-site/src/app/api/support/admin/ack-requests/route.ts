import { NextResponse } from 'next/server';
import { NO_STORE, govhubAck, upstreamJson } from '@/lib/ack-request-access';
import { GOVHUB_PUBLIC_BASE_URL } from '@/lib/govhub';
import { requireSupportAdmin } from '@/lib/support-admin-auth';
import { govhubHermesSecrets } from '@/lib/support-hermes-auth';

/**
 * Read-only: how many Acknowledgements requests are new on Gov Hub, and where to review them.
 * Support admins see the count only; reviewing stays on Gov Hub (steering committee, super admins).
 */
export async function GET(request: Request) {
  const auth = await requireSupportAdmin(request);
  if (!auth.ok) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401, headers: NO_STORE });
  const reviewUrl = `${GOVHUB_PUBLIC_BASE_URL.replace(/\/$/, '')}/dp/acknowledgements/requests/`;
  const key = govhubHermesSecrets()[0] || '';
  if (!key) return NextResponse.json({ ok: true, new: null, reviewUrl }, { headers: NO_STORE });
  try {
    const res = await govhubAck('summary/', { serverKey: key, timeoutMs: 10000 });
    const data = await upstreamJson(res);
    const count = res.ok && data?.ok && typeof data.new === 'number' ? data.new : null;
    return NextResponse.json({ ok: true, new: count, reviewUrl }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ ok: true, new: null, reviewUrl }, { headers: NO_STORE });
  }
}
