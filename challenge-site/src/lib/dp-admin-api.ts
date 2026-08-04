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

/** Admin routes that proxy to Hermes need both admin email and Web3Auth idToken. */
export async function requireDpAdminWithSession() {
  const cookieStore = await cookies();
  const email = await resolveAdminEmail(cookieStore);
  const session = await readSession();
  if (!email || !session?.idToken) {
    if (session && !email) {
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
      response: NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 }),
    };
  }
  return { ok: true as const, email, session };
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
