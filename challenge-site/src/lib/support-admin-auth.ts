import { cookies } from 'next/headers';
import { resolveAdminEmail } from '@/lib/dp-admin-auth';
import { hermesAuthorized } from '@/lib/support-hermes-auth';

export async function requireSupportAdmin(request: Request) {
  const cookieStore = await cookies();
  const email = await resolveAdminEmail(cookieStore);
  if (email) return { ok: true as const, email };
  if (hermesAuthorized(request)) return { ok: true as const, email: 'hermes' };
  return { ok: false as const };
}
