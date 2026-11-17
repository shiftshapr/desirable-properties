/**
 * Submitters see their own Acknowledgements requests (owner, 2026-11-17). Server only.
 *
 * Gov Hub holds the requests and decides who may see them (services/dp_ack_request_access.py):
 * - signed in: the requests sent from that account (the session's Gov Hub idToken goes along);
 * - not signed in: a one-time link emailed after "look up a request" (reference code + email).
 *   Using the link gives a view token, kept here in an httpOnly cookie and forwarded to Gov Hub
 *   as X-DP-Ack-View. The token never reaches the browser's JavaScript.
 *
 * Nothing is stored or logged on this server.
 */
import { NextResponse } from 'next/server';
import { clientIpFromHeaders, viewTokenFromCookieHeader } from '@/lib/ack-request';
import { readSession } from '@/lib/auth-session';
import { govhubHermesSecrets } from '@/lib/support-hermes-auth';
import { getGovHubProxyBaseUrl } from '@/lib/web3auth-config';

export { cleanViewToken, isUuid } from '@/lib/ack-request';

export const ACK_VIEW_COOKIE = 'dp_ack_view';
export const ACK_REQUESTS_API = '/api/dp/acknowledgements/requests/';
export const NO_STORE = { 'Cache-Control': 'no-store, private' };
export const UPSTREAM_DOWN = 'We could not reach the requests service just now. Please try again in a few minutes.';

export function readViewCookie(request: Request): string | null {
  return viewTokenFromCookieHeader(request.headers.get('cookie'), ACK_VIEW_COOKIE);
}

/** JSON only: a cross-site form cannot send application/json without a preflight. */
export function isJsonRequest(request: Request): boolean {
  return (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase() === 'application/json';
}

export function setViewCookie(res: NextResponse, token: string, maxAgeSec: number) {
  res.cookies.set(ACK_VIEW_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.max(60, Math.min(maxAgeSec, 6 * 60 * 60)),
  });
}

export function clearViewCookie(res: NextResponse) {
  res.cookies.set(ACK_VIEW_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

type UpstreamOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  /** Forward the signed-in member's idToken. */
  withSession?: boolean;
  viewToken?: string | null;
  /** The Gov Hub server key alone (the Support admin count), with no user. */
  serverKey?: string;
  /** Pass the browser's address (with the Gov Hub server key) so Gov Hub rate-limits the sender. */
  request?: Request;
  timeoutMs?: number;
};

/** Call Gov Hub's Acknowledgements requests API. `path` is relative to ACK_REQUESTS_API. */
export async function govhubAck(path: string, options: UpstreamOptions = {}): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.withSession) {
    const session = await readSession().catch(() => null);
    if (session?.idToken) headers.Authorization = `Bearer ${session.idToken}`;
  }
  if (options.viewToken) headers['X-DP-Ack-View'] = options.viewToken;
  if (options.serverKey) headers['X-DP-Hermes-Key'] = options.serverKey;
  if (options.request) {
    const ip = clientIpFromHeaders(options.request.headers);
    const key = govhubHermesSecrets()[0] || '';
    if (ip && key) {
      headers['X-DP-Hermes-Key'] = key;
      headers['X-DP-Client-IP'] = ip;
    }
  }
  return fetch(`${getGovHubProxyBaseUrl()}${ACK_REQUESTS_API}${path}`, {
    method: options.method || (options.body !== undefined ? 'POST' : 'GET'),
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(options.timeoutMs ?? 20000),
    cache: 'no-store',
    redirect: 'manual',
  });
}

export async function upstreamJson(res: Response): Promise<Record<string, unknown> | null> {
  const data = await res.json().catch(() => null);
  return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
}
