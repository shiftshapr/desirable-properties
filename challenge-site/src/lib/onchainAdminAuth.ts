export const ADMIN_COOKIE = 'onchain_admin_session';

export function adminEmails(): string[] {
  const raw = process.env.ONCHAIN_ADMIN_EMAILS ?? 'bridgitdao@gmail.com';
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function adminSecret(): string | null {
  const secret = process.env.ONCHAIN_ADMIN_SECRET?.trim();
  return secret || null;
}

export function isAdminEmail(email: string): boolean {
  return adminEmails().includes(email.trim().toLowerCase());
}

async function signToken(email: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(email.trim().toLowerCase()));
  return Array.from(new Uint8Array(sig))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function parseAdminSession(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;
  const [email, signature] = token.split(':');
  if (!email || !signature || !isAdminEmail(email)) return null;

  const secret = adminSecret();
  if (!secret) return null;

  const expected = await signToken(email, secret);
  if (!timingSafeEqualHex(expected, signature)) return null;
  return email;
}

export async function adminEmailFromRequest(request: {
  cookies: { get: (name: string) => { value: string } | undefined };
}): Promise<string | null> {
  return parseAdminSession(request.cookies.get(ADMIN_COOKIE)?.value);
}
