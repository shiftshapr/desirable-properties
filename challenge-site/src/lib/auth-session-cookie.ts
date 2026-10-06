/**
 * Session cookie names and chunk reassembly. No Node/jose imports so the edge
 * middleware can use it; encryption lives in auth-session.ts.
 */
export const SESSION_COOKIE = 'hermes_session';

/**
 * Browsers drop any cookie whose name+value exceeds 4096 bytes, silently. A
 * session carrying a Web3Auth idToken with a long Google photo URL (1100+
 * chars, present in both the claims and profileImage) encrypts to ~5.6 KB, so
 * sign-in "succeeded" on the server but no cookie was ever stored (2026-10-06).
 * Sessions over CHUNK_SIZE are split across hermes_session.0, .1, ... instead.
 */
export const CHUNK_SIZE = 3500;
/** Upper bound on chunk cookies; also how many stale chunk slots a write clears. */
export const MAX_CHUNKS = 5;

export interface SessionCookie {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAge: number;
}

/** Anything with cookies().get / request.cookies.get semantics. */
export interface CookieGetter {
  get(name: string): { value: string } | undefined;
}

/** Anything with response.cookies.set / cookies().set semantics. */
export interface CookieSetter {
  set(cookie: SessionCookie): unknown;
}

export function chunkCookieName(index: number) {
  return `${SESSION_COOKIE}.${index}`;
}

function sessionCookie(name: string, value: string, maxAge: number): SessionCookie {
  return {
    name,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  };
}

export function clearedSessionCookie(name: string): SessionCookie {
  return sessionCookie(name, '', 0);
}

/** Every cookie that could hold a session piece, cleared. */
export function clearedSessionCookies(): SessionCookie[] {
  const out = [clearedSessionCookie(SESSION_COOKIE)];
  for (let i = 0; i < MAX_CHUNKS; i++) out.push(clearedSessionCookie(chunkCookieName(i)));
  return out;
}

/**
 * Cookies that store an encrypted `token`: one cookie when it fits, otherwise
 * chunks. Every stale slot from the other layout is cleared in the same
 * response so a reader never stitches old and new pieces together. Pass
 * `existing` (the request's cookies) to only clear slots actually present.
 */
export function splitSessionCookies(
  token: string,
  maxAge: number,
  existing?: CookieGetter,
): SessionCookie[] {
  const present = (name: string) => !existing || Boolean(existing.get(name)?.value);
  const out: SessionCookie[] = [];

  if (token.length <= CHUNK_SIZE) {
    out.push(sessionCookie(SESSION_COOKIE, token, maxAge));
    for (let i = 0; i < MAX_CHUNKS; i++) {
      if (present(chunkCookieName(i))) out.push(clearedSessionCookie(chunkCookieName(i)));
    }
    return out;
  }

  const chunks: string[] = [];
  for (let offset = 0; offset < token.length; offset += CHUNK_SIZE) {
    chunks.push(token.slice(offset, offset + CHUNK_SIZE));
  }
  if (chunks.length > MAX_CHUNKS) {
    throw new Error(`Session too large to store (${token.length} bytes)`);
  }
  if (present(SESSION_COOKIE)) out.push(clearedSessionCookie(SESSION_COOKIE));
  chunks.forEach((value, i) => out.push(sessionCookie(chunkCookieName(i), value, maxAge)));
  for (let i = chunks.length; i < MAX_CHUNKS; i++) {
    if (present(chunkCookieName(i))) out.push(clearedSessionCookie(chunkCookieName(i)));
  }
  return out;
}

/** Raw encrypted session from a single cookie or reassembled from chunks. */
export function readRawSessionCookie(store: CookieGetter): string | undefined {
  const single = store.get(SESSION_COOKIE)?.value;
  if (single) return single;
  const parts: string[] = [];
  for (let i = 0; i < MAX_CHUNKS; i++) {
    const value = store.get(chunkCookieName(i))?.value;
    if (!value) break;
    parts.push(value);
  }
  return parts.length ? parts.join('') : undefined;
}

/** Cheap presence check (no decrypt) for middleware. */
export function hasSessionCookie(store: CookieGetter): boolean {
  return Boolean(readRawSessionCookie(store));
}
