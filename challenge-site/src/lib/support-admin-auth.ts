import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, parseAdminSession } from '@/lib/onchainAdminAuth';
import { hermesAuthorized } from '@/lib/support-hermes-auth';

export async function requireSupportAdmin(request: Request) {
  const cookieStore = await cookies();
  const email = await parseAdminSession(cookieStore.get(ADMIN_COOKIE)?.value);
  if (email) return { ok: true as const, email };
  if (hermesAuthorized(request)) return { ok: true as const, email: 'hermes' };
  return { ok: false as const };
}
