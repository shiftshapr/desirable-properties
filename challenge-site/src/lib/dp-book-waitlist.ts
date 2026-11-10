/** People who asked to be emailed when Version 1.0 of the book is out (owner, 2026-11-10).
 *
 * They appear in the admin broadcast tool as the "Book waitlist" group, so the launch email is
 * an ordinary broadcast. Each has their own unsubscribe link (/api/v1/waitlist/unsubscribe).
 */
import crypto from 'crypto';
import { ensureDpSchema } from '@/lib/dp-db';

export const WAITLIST_GROUP = { id: 'book-waitlist', name: 'Book waitlist', slug: 'book-waitlist', acronym: 'WAITLIST' };
export const WAITLIST_KEY_PREFIX = 'waitlist:';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeWaitlistEmail(raw: unknown): string | null {
  const email = String(raw || '').trim().toLowerCase();
  return email.length <= 254 && EMAIL_RE.test(email) ? email : null;
}

export async function joinWaitlist(rawEmail: unknown, source = 'dp-site') {
  const email = normalizeWaitlistEmail(rawEmail);
  if (!email) return { ok: false as const, error: 'invalid_email' };
  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };
  // Signing up again after unsubscribing turns the subscription back on.
  await pool.query(
    `INSERT INTO dp_book_waitlist (email, source, unsubscribe_token)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET unsubscribed_at = NULL`,
    [email, String(source).slice(0, 60), crypto.randomBytes(24).toString('hex')],
  );
  return { ok: true as const };
}

export type WaitlistEntry = { email: string; token: string; createdAt: string };

export async function listWaitlist(): Promise<WaitlistEntry[]> {
  const pool = await ensureDpSchema();
  if (!pool) return [];
  const res = await pool.query(
    'SELECT email, unsubscribe_token, created_at FROM dp_book_waitlist WHERE unsubscribed_at IS NULL ORDER BY created_at',
  );
  return res.rows.map((r) => ({
    email: String(r.email),
    token: String(r.unsubscribe_token),
    createdAt: new Date(String(r.created_at)).toISOString(),
  }));
}

export async function waitlistTokenFor(email: string): Promise<string | null> {
  const pool = await ensureDpSchema();
  if (!pool) return null;
  const res = await pool.query('SELECT unsubscribe_token FROM dp_book_waitlist WHERE email = $1', [email.toLowerCase()]);
  return res.rows[0] ? String(res.rows[0].unsubscribe_token) : null;
}

export async function leaveWaitlist(token: string): Promise<boolean> {
  const pool = await ensureDpSchema();
  if (!pool || !token) return false;
  const res = await pool.query(
    'UPDATE dp_book_waitlist SET unsubscribed_at = now() WHERE unsubscribe_token = $1 RETURNING email',
    [token],
  );
  return (res.rowCount || 0) > 0;
}
