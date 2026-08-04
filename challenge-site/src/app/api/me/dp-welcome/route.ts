import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { buildDefaultProfileWelcome, type ProfileWelcomeLink } from '@/lib/dp-welcome-default';
import { getGovHubBaseUrl } from '@/lib/web3auth-config';

type UpstreamWelcome = {
  id?: unknown;
  title?: unknown;
  body?: unknown;
  link_url?: unknown;
  variant?: unknown;
};

/** `lead` is the pre-rename spelling of `coordinator`; Gov Hub may still send it. */
const WELCOME_VARIANTS = new Set(['member', 'coordinator', 'lead']);
const WELCOME_PATHS = new Set(['/welcome/member', '/welcome/coordinator', '/welcome/lead']);

function normalizeVariant(variant: string): 'member' | 'coordinator' {
  return variant === 'member' ? 'member' : 'coordinator';
}

function isSafeWelcomeLink(value: unknown, request: Request): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = value.startsWith('/')
      ? new URL(value, 'https://desirableproperties.org')
      : new URL(value, request.url);
    const allowedOrigins = new Set([
      new URL(request.url).origin,
      'https://desirableproperties.org',
      'https://www.desirableproperties.org',
      'http://127.0.0.1:3005',
      'http://127.0.0.1:3006',
      'http://localhost:3005',
      'http://localhost:3006',
      'https://localhost:3005',
      'https://localhost:3006',
    ]);
    return allowedOrigins.has(url.origin) && WELCOME_PATHS.has(url.pathname);
  } catch {
    return false;
  }
}

function toRelativeWelcomeUrl(linkUrl: string, request: Request): string {
  try {
    const url = linkUrl.startsWith('/')
      ? new URL(linkUrl, 'https://desirableproperties.org')
      : new URL(linkUrl, request.url);
    if (!WELCOME_PATHS.has(url.pathname)) return '/welcome/member';
    return `${url.pathname}${url.search}`;
  } catch {
    return '/welcome/member';
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
    link_url: toRelativeWelcomeUrl(welcome.link_url as string, request),
    variant: normalizeVariant(welcome.variant as string),
  }));
}

function withDefaultWelcome(welcomes: ProfileWelcomeLink[]): ProfileWelcomeLink[] {
  if (welcomes.length > 0) return welcomes;
  return [buildDefaultProfileWelcome('member')];
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
    const resolved = withDefaultWelcome(welcomes);
    return NextResponse.json(
      { authenticated: true, status: 'ok', welcomes: resolved, count: resolved.length },
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
