import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, adminEmails, parseAdminSession } from '@/lib/dp-admin-auth';
import { listDbAdminEmails } from '@/lib/dp-admin-store';

export async function requireDpAdmin() {
  const cookieStore = await cookies();
  const email = await parseAdminSession(cookieStore.get(ADMIN_COOKIE)?.value);
  if (!email) {
    return { ok: false as const, response: NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 }) };
  }
  return { ok: true as const, email };
}

export async function allAdminEmails(): Promise<string[]> {
  const envEmails = adminEmails();
  const dbEmails = await listDbAdminEmails();
  const merged = new Set<string>();
  for (const e of [...envEmails, ...dbEmails]) {
    const norm = e.trim().toLowerCase();
    if (norm) merged.add(norm);
  }
  return [...merged].sort();
}

export function jsonError(message: string, status = 400, error = 'bad_request') {
  return NextResponse.json({ ok: false, error, message }, { status });
}
