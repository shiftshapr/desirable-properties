/**
 * What an unsubscribe token should do, decided from the row it resolves to (dp_broadcast_preference or the
 * dp_broadcast_unsubscribe index). Pure, so it can be tested without a database.
 *
 * - A token linked to an account (user_id) sets do_not_send on that account's dp_broadcast_preference row.
 * - A token with an email and no user_id (Luma registrants, mailing-list signups) opts that email out in
 *   dp_broadcast_email_optout.
 * - Anything else is not a working link: the page says so instead of claiming success.
 */

export type ResolvedUnsubscribeToken = { userId?: string | null; email?: string | null } | null | undefined;

export type UnsubscribePlan =
  | { kind: 'user'; userId: string; email: string | null }
  | { kind: 'email'; email: string }
  | { kind: 'none' };

const ACCOUNT_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeOptOutEmail(email: unknown): string | null {
  const e = String(email ?? '').trim().toLowerCase();
  return EMAIL_RE.test(e) ? e : null;
}

export function planUnsubscribe(found: ResolvedUnsubscribeToken): UnsubscribePlan {
  if (!found) return { kind: 'none' };
  const userId = String(found.userId ?? '').trim();
  const email = normalizeOptOutEmail(found.email);
  if (ACCOUNT_ID_RE.test(userId)) return { kind: 'user', userId, email };
  if (email) return { kind: 'email', email };
  return { kind: 'none' };
}

/** Response header that tells senders this deployment honours email-only tokens. */
export const UNSUBSCRIBE_FLOW_HEADER = 'X-DP-Unsubscribe-Flow';
export const UNSUBSCRIBE_FLOW_VERSION = 'email-optout-v1';
