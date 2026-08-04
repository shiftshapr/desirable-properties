import { GOVHUB_PUBLIC_BASE_URL } from '@/lib/govhub';
import { hermesApiSecret } from '@/lib/support-hermes-auth';

const GOVHUB_USER_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isGovHubUserId(userId: string | null | undefined) {
  return GOVHUB_USER_ID_RE.test(String(userId || '').trim());
}

/**
 * Resolve Gov Hub account emails for workgroup signup user IDs.
 * Signup rows store Gov Hub User.id, not Canopi AppUser.id.
 */
export async function fetchGovHubUserEmails(userIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(userIds.map((id) => String(id || '').trim()).filter(isGovHubUserId))];
  const out = new Map<string, string>();
  if (!ids.length) return out;

  const secret = hermesApiSecret();
  if (!secret) return out;

  try {
    const base = GOVHUB_PUBLIC_BASE_URL.replace(/\/$/, '');
    const res = await fetch(`${base}/api/internal/dp/broadcast-user-emails`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ userIds: ids }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return out;
    const data = await res.json().catch(() => ({}));
    const emails = data?.emails;
    if (!emails || typeof emails !== 'object') return out;
    for (const [userId, email] of Object.entries(emails)) {
      const normalized = String(email || '')
        .trim()
        .toLowerCase();
      if (userId && normalized.includes('@')) out.set(userId, normalized);
    }
  } catch {
    /* network / timeout */
  }
  return out;
}
