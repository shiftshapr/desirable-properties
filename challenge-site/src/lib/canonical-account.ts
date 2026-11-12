/**
 * Linked Gov Hub accounts (Gov Hub docs/ACCOUNT-LINKING-DESIGN.md): one person can sign in with
 * several accounts, and Gov Hub resolves each to one canonical account. New DP site sessions already
 * carry the canonical id (Gov Hub's /api/auth/web3auth returns it). This module fixes sessions issued
 * before a link was made: it asks Gov Hub who the viewer is and returns the canonical id + username
 * when they differ from the cookie.
 */

export type AccountLinksOverview = {
  canonical_user_id?: string;
  accounts?: { id: string; username: string; canonical?: boolean }[];
};

/** The canonical account to put in the session, or null when the session is already canonical. */
export function canonicalFromOverview(
  sessionUserId: string,
  data: AccountLinksOverview | null | undefined,
): { userId: string; username: string; linkedUserIds: string[] } | null {
  const canonicalId = String(data?.canonical_user_id || '').trim();
  if (!canonicalId || canonicalId === sessionUserId) return null;
  const accounts = Array.isArray(data?.accounts) ? data!.accounts! : [];
  const linked = accounts.map((a) => String(a.id));
  // Only move the session to an account Gov Hub says this person owns.
  if (!linked.includes(sessionUserId) || !linked.includes(canonicalId)) return null;
  const main = accounts.find((a) => String(a.id) === canonicalId);
  return { userId: canonicalId, username: String(main?.username || ''), linkedUserIds: linked };
}

const checkedAt = new Map<string, number>();
const RECHECK_MS = 10 * 60 * 1000;

/** Ask Gov Hub (Bearer idToken) at most every 10 minutes per session user. Never throws. */
export async function fetchCanonicalAccount(
  govhubBaseUrl: string,
  sessionUserId: string,
  idToken: string,
): Promise<{ userId: string; username: string; linkedUserIds: string[] } | null> {
  const last = checkedAt.get(sessionUserId) || 0;
  if (Date.now() - last < RECHECK_MS) return null;
  checkedAt.set(sessionUserId, Date.now());
  try {
    const res = await fetch(`${govhubBaseUrl}/api/account/links`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${idToken}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return canonicalFromOverview(sessionUserId, (await res.json()) as AccountLinksOverview);
  } catch {
    return null;
  }
}
