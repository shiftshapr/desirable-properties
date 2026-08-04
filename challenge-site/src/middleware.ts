import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE, parseAdminSession } from '@/lib/onchainAdminAuth';

const SESSION_COOKIE = 'hermes_session';

/** Admin HTML routes are client-gated (Web3Auth popup on 401). APIs stay server-protected. */
const PROTECTED_API_PREFIXES = [
  '/api/onchain/admin',
  '/api/support/admin',
  '/api/agent/admin',
  '/api/admin',
];

/** Public apex redirect — must not leak internal port 3005 from proxy_pass. */
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
  return Boolean(request.cookies.get(SESSION_COOKIE)?.value);
}

export async function middleware(request: NextRequest) {
  const apex = apexRedirect(request);
  if (apex) return apex;

  const { pathname } = request.nextUrl;

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
