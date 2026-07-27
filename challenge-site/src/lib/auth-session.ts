import { createHash } from 'crypto';
import { EncryptJWT, jwtDecrypt } from 'jose';
import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'hermes_session';
const MAX_AGE_SEC = 60 * 60 * 24;

export interface HermesSession {
  verifierId: string;
  userId: string;
  username: string;
  displayName: string | null;
  profileImage?: string | null;
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

export async function createSessionCookie(payload: HermesSession) {
  const token = await new EncryptJWT({ ...payload })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SEC}s`)
    .encrypt(sessionSecretKey());

  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: MAX_AGE_SEC,
  };
}

export async function readSession(): Promise<HermesSession | null> {
  try {
    const store = await cookies();
    const raw = store.get(SESSION_COOKIE)?.value;
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
      profileImage: payload.profileImage ? String(payload.profileImage) : null,
      idToken,
      email: payload.email ? String(payload.email) : null,
    };
  } catch {
    return null;
  }
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
