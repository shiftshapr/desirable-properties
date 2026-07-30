import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { getGovHubBaseUrl } from '@/lib/web3auth-config';

type UpstreamWelcome = {
  id?: unknown;
  title?: unknown;
  link_url?: unknown;
  variant?: unknown;
};

const WELCOME_VARIANTS = new Set(['member', 'lead']);

function isSafeWelcomeLink(value: unknown, request: Request): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value, request.url);
    const allowedOrigins = new Set([
      new URL(request.url).origin,
      'https://desirableproperties.org',
      'https://www.desirableproperties.org',
    ]);
    return (
      allowedOrigins.has(url.origin) &&
      (url.pathname === '/welcome/member' || url.pathname === '/welcome/lead')
    );
  } catch {
    return false;
  }
}

function validWelcomes(data: unknown, request: Request) {
  if (!data || typeof data !== 'object' || !Array.isArray((data as { welcomes?: unknown }).welcomes)) {
    return null;
  }

  const welcomes = (data as { welcomes: UpstreamWelcome[] }).welcomes;
  if (
    !welcomes.every(
      (welcome) =>
        typeof welcome.id === 'string' &&
        typeof welcome.title === 'string' &&
        welcome.title.length > 0 &&
        isSafeWelcomeLink(welcome.link_url, request) &&
        typeof welcome.variant === 'string' &&
        WELCOME_VARIANTS.has(welcome.variant),
    )
  ) {
    return null;
  }

  return welcomes.map((welcome) => ({
    id: welcome.id as string,
    title: welcome.title as string,
    link_url: welcome.link_url as string,
    variant: welcome.variant as 'member' | 'lead',
  }));
}

function errorResponse(status: number, code: string, authenticated: boolean) {
  return NextResponse.json(
    { authenticated, status: 'degraded', code, welcomes: [], count: 0 },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function GET(request: Request) {
  const session = await readSession();
  if (!session?.idToken) {
    return errorResponse(401, 'AUTHENTICATION_REQUIRED', false);
  }

  try {
    const res = await fetch(`${getGovHubBaseUrl()}/api/me/dp-welcome/`, {
      headers: { Authorization: `Bearer ${session.idToken}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      console.error('DP welcome upstream request failed', { status: res.status });
      if (res.status === 401 || res.status === 403) {
        return errorResponse(res.status, 'UPSTREAM_AUTH_FAILED', true);
      }
      return errorResponse(502, 'UPSTREAM_UNAVAILABLE', true);
    }
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      console.error('DP welcome upstream response was not valid JSON');
      return errorResponse(502, 'UPSTREAM_MALFORMED_RESPONSE', true);
    }
    const welcomes = validWelcomes(data, request);
    if (!welcomes) {
      console.error('DP welcome upstream response was malformed');
      return errorResponse(502, 'UPSTREAM_MALFORMED_RESPONSE', true);
    }
    return NextResponse.json(
      { authenticated: true, status: 'ok', welcomes, count: welcomes.length },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    const isTimeout = error instanceof DOMException && error.name === 'TimeoutError';
    console.error('DP welcome upstream request failed', {
      type: isTimeout ? 'timeout' : 'network_error',
    });
    return errorResponse(isTimeout ? 504 : 502, isTimeout ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE', true);
  }
}
