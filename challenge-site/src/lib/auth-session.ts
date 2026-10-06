import { createHash } from 'crypto';
import { EncryptJWT, jwtDecrypt } from 'jose';
import { cookies } from 'next/headers';
import { normalizeProfileImageForSession } from '@/lib/avatar';
import type { AuthUser } from '@/lib/auth-types';
import {
  clearedSessionCookies,
  readRawSessionCookie,
  splitSessionCookies,
  type CookieGetter,
  type CookieSetter,
  type SessionCookie,
} from '@/lib/auth-session-cookie';

export {
  SESSION_COOKIE,
  hasSessionCookie,
  readRawSessionCookie,
  type CookieGetter,
  type CookieSetter,
  type SessionCookie,
} from '@/lib/auth-session-cookie';

const MAX_AGE_SEC = 60 * 60 * 24;

export interface HermesSession {
  verifierId: string;
  userId: string;
  username: string;
  displayName: string | null;
  profileImage?: string | null;
  canopiUserId?: string | null;
  idToken: string;
  email?: string | null;
}

function sessionSecretKey() {
  const secret = process.env.AUTH_SESSION_SECRET || process.env.HERMES_SESSION_SECRET || '';
  if (!secret || secret.length < 16) {
    throw new Error('AUTH_SESSION_SECRET must be set (min 16 chars)');
  }
  // jose A256GCM requires exactly 256 bits; hex secrets are decoded, others are hashed.
  if (/^[0-9a-f]{64}$/i.test(secret)) {
    return Buffer.from(secret, 'hex');
  }
  return createHash('sha256').update(secret).digest();
}

export async function encryptSession(payload: HermesSession): Promise<string> {
  return new EncryptJWT({ ...payload })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SEC}s`)
    .encrypt(sessionSecretKey());
}

/**
 * Cookies that store `payload`: one cookie when it fits, otherwise chunks.
 * Every stale slot from the other layout is cleared in the same response so a
 * reader never stitches old and new pieces together. Pass `existing` (the
 * request's cookies) to only clear slots that are actually present.
 */
/** Encrypted `payload` as one cookie, or chunks when it would exceed the 4 KB limit. */
export async function createSessionCookies(
  payload: HermesSession,
  existing?: CookieGetter,
): Promise<SessionCookie[]> {
  return splitSessionCookies(await encryptSession(payload), MAX_AGE_SEC, existing);
}

export function applySessionCookies(target: CookieSetter, sessionCookies: SessionCookie[]) {
  for (const cookie of sessionCookies) target.set(cookie);
}

/** Encrypt `payload` and write it to `target` (response.cookies or cookies()). */
export async function setSessionCookies(
  target: CookieSetter,
  payload: HermesSession,
  existing?: CookieGetter,
) {
  applySessionCookies(target, await createSessionCookies(payload, existing));
}

export async function readSessionFromCookieValue(
  raw: string | undefined | null,
): Promise<HermesSession | null> {
  try {
    if (!raw) return null;
    const { payload } = await jwtDecrypt(raw, sessionSecretKey());
    const verifierId = String(payload.verifierId || '');
    const userId = String(payload.userId || '');
    const idToken = String(payload.idToken || '');
    if (!verifierId || !userId || !idToken) return null;
    return {
      verifierId,
      userId,
      username: String(payload.username || ''),
      displayName: payload.displayName ? String(payload.displayName) : null,
      profileImage: normalizeProfileImageForSession(
        payload.profileImage ? String(payload.profileImage) : null,
      ),
      canopiUserId: payload.canopiUserId ? String(payload.canopiUserId) : null,
      idToken,
      email: payload.email ? String(payload.email) : null,
    };
  } catch {
    return null;
  }
}

export async function readSessionFromCookies(store: CookieGetter): Promise<HermesSession | null> {
  return readSessionFromCookieValue(readRawSessionCookie(store));
}

export async function readSession(): Promise<HermesSession | null> {
  return readSessionFromCookies(await cookies());
}

export function sessionToAuthUser(session: HermesSession | null): AuthUser | null {
  if (!session) return null;
  return {
    id: session.userId,
    username: session.username,
    displayName: session.displayName,
    profileImage: session.profileImage ?? null,
    verifierId: session.verifierId,
  };
}

export async function clearSessionCookie() {
  const store = await cookies();
  applySessionCookies(store, clearedSessionCookies());
}
