import { ensureDpSchema } from '@/lib/dp-db';
import { fetchCanopiUserEmails, isCanopiUserId } from '@/lib/dp-canopi-user';
import { looksLikeEmail } from '@/lib/dp-broadcast-result';
import type { BroadcastAudienceRow } from '@/lib/dp-broadcast-store';

export type BroadcastEmailEnrichment = {
  canopi: number;
  supportTickets: number;
  usernameEmail: number;
  totalWithEmail: number;
  missingEmail: number;
};

/** Emails captured from support tickets (user_id -> email). */
async function supportTicketEmails(userIds: string[]): Promise<Map<string, string>> {
  const pool = await ensureDpSchema();
  const out = new Map<string, string>();
  if (!pool) return out;

  const ids = userIds.filter(Boolean);
  if (!ids.length) return out;

  try {
    const res = await pool.query(
      `SELECT DISTINCT ON (user_id) user_id, email
       FROM dp_support_ticket
       WHERE user_id = ANY($1::text[])
         AND email IS NOT NULL
         AND trim(email) <> ''
       ORDER BY user_id, updated_at DESC`,
      [ids],
    );
    for (const row of res.rows) {
      const userId = String(row.user_id || '').trim();
      const email = String(row.email || '')
        .trim()
        .toLowerCase();
      if (userId && email.includes('@')) out.set(userId, email);
    }
  } catch {
    /* table may not exist yet during rollout */
  }
  return out;
}

/**
 * Enrich broadcast audience rows with recipient emails where possible.
 * Sources (in order): Canopi internal API, support ticket capture.
 */
export async function enrichBroadcastAudienceEmails(
  rows: BroadcastAudienceRow[],
): Promise<{ rows: BroadcastAudienceRow[]; stats: BroadcastEmailEnrichment }> {
  const userIds = rows.map((r) => r.userId).filter((id): id is string => Boolean(id && isCanopiUserId(id)));

  const [canopiEmails, ticketEmails] = await Promise.all([
    fetchCanopiUserEmails(userIds),
    supportTicketEmails(userIds),
  ]);

  let canopi = 0;
  let supportTickets = 0;
  let usernameEmail = 0;
  let totalWithEmail = 0;

  const enriched = rows.map((row) => {
    if (row.email) {
      totalWithEmail += 1;
      return row;
    }
    const userId = row.userId?.trim();

    let email: string | null = null;
    if (userId && canopiEmails.has(userId)) {
      email = canopiEmails.get(userId)!;
      canopi += 1;
    } else if (userId && ticketEmails.has(userId)) {
      email = ticketEmails.get(userId)!;
      supportTickets += 1;
    } else {
      email = looksLikeEmail(row.userName);
      if (email) usernameEmail += 1;
    }

    if (email) {
      totalWithEmail += 1;
      return { ...row, email };
    }
    return row;
  });

  return {
    rows: enriched,
    stats: {
      canopi,
      supportTickets,
      usernameEmail,
      totalWithEmail,
      missingEmail: enriched.length - totalWithEmail,
    },
  };
}
