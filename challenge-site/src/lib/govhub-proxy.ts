import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { getGovHubBaseUrl } from '@/lib/web3auth-config';

type ProxyOptions = {
  requireAuth?: boolean;
  method?: string;
  body?: unknown;
  searchParams?: URLSearchParams | string;
  timeoutMs?: number;
};

export async function proxyGovHubJson(
  path: string,
  options: ProxyOptions = {},
): Promise<NextResponse> {
  const requireAuth = options.requireAuth !== false;
  const session = await readSession();
  if (requireAuth && !session?.idToken) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'AUTHENTICATION_REQUIRED' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const base = getGovHubBaseUrl();
  const qs =
    typeof options.searchParams === 'string'
      ? options.searchParams
      : options.searchParams?.toString() || '';
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}${qs ? `?${qs}` : ''}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (session?.idToken) {
    headers.Authorization = `Bearer ${session.idToken}`;
  }
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(url, {
      method: options.method || (options.body !== undefined ? 'POST' : 'GET'),
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(options.timeoutMs ?? 45000),
      cache: 'no-store',
    });

    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        return NextResponse.json(
          { error: 'Upstream returned non-JSON', code: 'UPSTREAM_MALFORMED_RESPONSE' },
          { status: 502, headers: { 'Cache-Control': 'no-store' } },
        );
      }
    }

    return NextResponse.json(data ?? {}, {
      status: res.status,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    const isTimeout = error instanceof DOMException && error.name === 'TimeoutError';
    return NextResponse.json(
      {
        error: isTimeout ? 'Upstream timeout' : 'Upstream unavailable',
        code: isTimeout ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE',
      },
      { status: isTimeout ? 504 : 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
