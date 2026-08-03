import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { adminEmails, parseAdminSession, ADMIN_COOKIE } from '@/lib/dp-admin-auth';

export async function GET() {
  const cookieStore = await cookies();
  const email = await parseAdminSession(cookieStore.get(ADMIN_COOKIE)?.value);
  if (!email) {
    return NextResponse.json({ ok: false, isAdmin: false }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    isAdmin: true,
    email,
    adminEmails: adminEmails(),
  });
}
