import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { adminEmails, resolveAdminEmail } from '@/lib/dp-admin-auth';
import { readSession, readSessionFromCookieValue, SESSION_COOKIE } from '@/lib/auth-session';
import { listDbAdminEmails } from '@/lib/dp-admin-store';

export async function requireDpAdmin() {
  const cookieStore = await cookies();
  const email = await resolveAdminEmail(cookieStore);
  if (email) {
    return { ok: true as const, email };
  }

  const session = await readSessionFromCookieValue(cookieStore.get(SESSION_COOKIE)?.value);
  if (session) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          ok: false,
          error: 'forbidden',
          message: 'Your account is signed in but is not authorized for site admin.',
        },
        { status: 403 },
      ),
    };
  }

  return {
    ok: false as const,
    response: NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 }),
  };
}

/** Admin routes that proxy to Gov Hub need a verified DP admin email (Web3Auth or legacy). */
export async function requireDpAdminForGovHubProxy() {
  const cookieStore = await cookies();
  const email = await resolveAdminEmail(cookieStore);
  const session = await readSession();
  if (!email) {
    if (session) {
      return {
        ok: false as const,
        response: NextResponse.json(
          {
            ok: false,
            error: 'forbidden',
            message: 'Your account is signed in but is not authorized for admin.',
          },
          { status: 403 },
        ),
      };
    }
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          ok: false,
          error: 'unauthorized',
          message: 'Sign in to DP admin to use this feature.',
        },
        { status: 401 },
      ),
    };
  }
  return { ok: true as const, email, session };
}

/** Routes that forward Web3Auth idToken upstream still need a Hermes session. */
export async function requireDpAdminWithSession() {
  const auth = await requireDpAdminForGovHubProxy();
  if (!auth.ok) return auth;
  if (!auth.session?.idToken) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          ok: false,
          error: 'unauthorized',
          message: 'Sign in with Web3Auth to use this feature.',
        },
        { status: 401 },
      ),
    };
  }
  return { ok: true as const, email: auth.email, session: auth.session };
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
