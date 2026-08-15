import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { govhubInternalApiSecret } from '@/lib/support-hermes-auth';
import { getGovHubProxyBaseUrl } from '@/lib/web3auth-config';

type ProxyOptions = {
  requireAuth?: boolean;
  /** DP site admin email for server-to-server Gov Hub proxy auth. */
  adminEmail?: string;
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

  const base = getGovHubProxyBaseUrl();
  const qs =
    typeof options.searchParams === 'string'
      ? options.searchParams
      : options.searchParams?.toString() || '';
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}${qs ? `?${qs}` : ''}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  const adminEmail = options.adminEmail?.trim().toLowerCase();
  const internalSecret = govhubInternalApiSecret();
  if (adminEmail && internalSecret) {
    headers.Authorization = `Bearer ${internalSecret}`;
    headers['X-DP-Admin-Email'] = adminEmail;
  } else if (session?.idToken) {
    headers.Authorization = `Bearer ${session.idToken}`;
  } else if (adminEmail && !internalSecret) {
    return NextResponse.json(
      {
        error: 'Gov Hub proxy is not configured (missing internal secret)',
        code: 'GOVHUB_PROXY_MISCONFIGURED',
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
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
      redirect: 'manual',
    });

    if (res.status >= 300 && res.status < 400) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTHENTICATION_REQUIRED' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 240);
        const upstreamStatus = res.status;
        const contentType = res.headers.get('content-type') || '';
        const detail = snippet
          ? `Gov Hub returned non-JSON (${upstreamStatus}, ${contentType}): ${snippet}`
          : `Gov Hub returned empty non-JSON response (${upstreamStatus})`;
        return NextResponse.json(
          {
            error: detail,
            message: detail,
            code: 'UPSTREAM_MALFORMED_RESPONSE',
            upstream_status: upstreamStatus,
            upstream_content_type: contentType,
          },
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
