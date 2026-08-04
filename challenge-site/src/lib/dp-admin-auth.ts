import { readSessionFromCookieValue, SESSION_COOKIE } from '@/lib/auth-session';
import { listDbAdminEmails } from '@/lib/dp-admin-store';
import {
  ADMIN_COOKIE,
  adminEmails,
  isAdminEmail,
  parseAdminSession,
} from '@/lib/onchainAdminAuth';

export {
  ADMIN_COOKIE,
  adminEmails,
  isAdminEmail,
  parseAdminSession,
} from '@/lib/onchainAdminAuth';

type CookieReader = {
  get: (name: string) => { value: string } | undefined;
};

export async function isEmailAdmin(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  if (isAdminEmail(normalized)) return true;
  const dbEmails = await listDbAdminEmails();
  return dbEmails.some((entry) => entry.trim().toLowerCase() === normalized);
}

/** True when the user has any valid sign-in cookie (Web3Auth or legacy admin). */
export async function hasSiteAuth(cookies: CookieReader): Promise<boolean> {
  const legacy = await parseAdminSession(cookies.get(ADMIN_COOKIE)?.value);
  if (legacy) return true;
  const session = await readSessionFromCookieValue(cookies.get(SESSION_COOKIE)?.value);
  return session !== null;
}

/** Resolve an admin email from Web3Auth session or legacy on-chain admin cookie. */
export async function resolveAdminEmail(cookies: CookieReader): Promise<string | null> {
  const legacy = await parseAdminSession(cookies.get(ADMIN_COOKIE)?.value);
  if (legacy) return legacy;

  const session = await readSessionFromCookieValue(cookies.get(SESSION_COOKIE)?.value);
  const email = session?.email?.trim().toLowerCase();
  if (!email) return null;
  if (!(await isEmailAdmin(email))) return null;
  return email;
}

export async function adminEmailFromRequest(request: CookieReader): Promise<string | null> {
  return resolveAdminEmail(request);
}
