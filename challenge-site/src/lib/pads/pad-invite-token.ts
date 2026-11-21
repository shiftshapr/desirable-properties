/**
 * Invitation opt-out links without storing the address: the token is the recipient's address encrypted with
 * AES-256-GCM under a key derived from the server secret, so the link works with no row in any table and the URL
 * does not show the address. Hashes for the rate limits use HMAC-SHA256 under a separate derived key.
 * No 'server-only' import so node --test can load it; only server code passes it a secret.
 */
import crypto from 'node:crypto';

function derive(secret: string, purpose: string): Buffer {
  return crypto.createHash('sha256').update(`dp-pad-invite|${purpose}|${secret}`).digest();
}

export function hashInviteEmail(email: string, secret: string): string {
  return crypto.createHmac('sha256', derive(secret, 'hash')).update(String(email).trim().toLowerCase()).digest('hex');
}

export function encodeOptOutToken(email: string, secret: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', derive(secret, 'optout'), iv);
  const body = Buffer.concat([cipher.update(String(email).trim().toLowerCase(), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
}

/** The address, or null for a token this server did not make (or one that was altered). */
export function decodeOptOutToken(token: string, secret: string): string | null {
  try {
    const raw = Buffer.from(String(token || ''), 'base64url');
    if (raw.length < 29 || raw.length > 400) return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', derive(secret, 'optout'), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const email = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
  } catch {
    return null;
  }
}
