import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE, parseAdminSession } from '@/lib/onchainAdminAuth';

const PROTECTED_PREFIXES = ['/onchain/admin', '/api/onchain/admin'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/onchain/admin/login' || pathname === '/api/onchain/admin/login') {
    return NextResponse.next();
  }

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!isProtected) {
    return NextResponse.next();
  }

  const email = await parseAdminSession(request.cookies.get(ADMIN_COOKIE)?.value);
  if (!email) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/onchain/admin/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/onchain/admin/:path*', '/api/onchain/admin/:path*'],
};
