import { NextResponse } from 'next/server';
import { clientIpFromHeaders } from '@/lib/ack-request';
import { readSession } from '@/lib/auth-session';
import { govhubHermesSecrets } from '@/lib/support-hermes-auth';
import { getGovHubProxyBaseUrl } from '@/lib/web3auth-config';

const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * Acknowledgements adjustment request: sent on to Gov Hub, which stores it (privately) and
 * returns a reference code. Signing in is optional. The browser's address goes along in
 * X-DP-Client-IP with the Gov Hub server key, so Gov Hub can rate-limit the sender rather than
 * this server. Nothing is stored or logged here, and no email is sent.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400, headers: NO_STORE });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400, headers: NO_STORE });
  }

  const session = await readSession().catch(() => null);
  const ip = clientIpFromHeaders(request.headers);
  const url = `${getGovHubProxyBaseUrl()}/api/dp/acknowledgements/requests/`;
  // Gov Hub trusts X-DP-Client-IP only alongside one of its server keys; without it, it rate-limits
  // by this server's address instead.
  const key = govhubHermesSecrets()[0] || '';
  const headers: Record<string, string> = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (session?.idToken) headers.Authorization = `Bearer ${session.idToken}`;
  if (key && ip) {
    headers['X-DP-Hermes-Key'] = key;
    headers['X-DP-Client-IP'] = ip;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
      cache: 'no-store',
      redirect: 'manual',
    });
    const data = await res.json().catch(() => null);
    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { ok: false, error: 'upstream', message: 'We could not send your request just now. Please try again in a few minutes.' },
        { status: 502, headers: NO_STORE },
      );
    }
    return NextResponse.json(data, { status: res.status, headers: NO_STORE });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'upstream', message: 'We could not send your request just now. Please try again in a few minutes.' },
      { status: 504, headers: NO_STORE },
    );
  }
}
