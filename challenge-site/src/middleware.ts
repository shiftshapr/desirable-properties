import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE, parseAdminSession } from '@/lib/onchainAdminAuth';
import { hasSessionCookie } from '@/lib/auth-session-cookie';
import { padSlugTypoRedirectPath } from '@/lib/pad-slug-sanitize';
import { landingPadsEnabled } from '@/lib/landing-pads/flag';
import { ARRIVAL_COOKIE, ARRIVAL_MAX_AGE_S, decodeArrival, encodeArrival, mergeArrival, touchFromParams } from '@/lib/attribution/attribution-core';

/** Admin HTML routes are client-gated (Web3Auth popup on 401). APIs stay server-protected. */
const PROTECTED_API_PREFIXES = [
  '/api/onchain/admin',
  '/api/support/admin',
  '/api/agent/admin',
  '/api/admin',
];

/** Public apex redirect – must not leak internal port 3005 from proxy_pass. */
function apexRedirect(request: NextRequest) {
  const host = (request.headers.get('host') || '').split(':')[0];
  if (host !== 'www.desirableproperties.org') return null;

  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const path = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const response = NextResponse.redirect(`${proto}://desirableproperties.org${path}`, 302);
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  return response;
}

async function hasSiteAuth(request: NextRequest): Promise<boolean> {
  const legacy = await parseAdminSession(request.cookies.get(ADMIN_COOKIE)?.value);
  if (legacy) return true;
  return hasSessionCookie(request.cookies);
}

/**
 * First and last touch: a message tag (?ref=em-1122-closes) or a Canopi referral on any page goes into the dp_arrival
 * cookie (attribution-core.ts) before the page renders, so it is kept even when the page then takes ?ref off the
 * address bar (PadInvite). Page loads only, not API calls.
 */
function withArrival(request: NextRequest, response: NextResponse): NextResponse {
  const { pathname } = request.nextUrl;
  if (request.method !== 'GET' || pathname.startsWith('/api/') || pathname.startsWith('/_next/')) return response;
  const touch = touchFromParams(request.nextUrl.searchParams);
  if (!touch) return response;
  const prev = decodeArrival(request.cookies.get(ARRIVAL_COOKIE)?.value);
  const next = mergeArrival(prev, touch, new Date());
  const proto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '');
  response.cookies.set(ARRIVAL_COOKIE, encodeArrival(next), {
    maxAge: ARRIVAL_MAX_AGE_S,
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    secure: proto === 'https',
  });
  return response;
}

export async function middleware(request: NextRequest) {
  // www -> apex first: the cookie is set on the apex hop (the redirect keeps the query).
  const apex = apexRedirect(request);
  if (apex) return apex;
  return withArrival(request, await route(request));
}

async function route(request: NextRequest): Promise<NextResponse> {

  const { pathname } = request.nextUrl;

  // Landing pads are hidden on production (landingPadsEnabled): no /pad typo redirect there.
  const padTypoPath = landingPadsEnabled() ? padSlugTypoRedirectPath(pathname) : null;
  if (padTypoPath) {
    const url = request.nextUrl.clone();
    url.pathname = padTypoPath;
    return NextResponse.redirect(url, 308);
  }

  if (pathname === '/onchain/admin/login') {
    const next = request.nextUrl.searchParams.get('next') || '/onchain/admin';
    return NextResponse.redirect(new URL(next, request.url));
  }

  const isProtectedApi = PROTECTED_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!isProtectedApi) {
    return NextResponse.next();
  }

  const authed = await hasSiteAuth(request);
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
