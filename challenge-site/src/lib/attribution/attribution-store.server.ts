/**
 * dp_account_attribution  one row per account, written on its first sign-in on the DP site that carries a dp_arrival
 *                         cookie (attribution-core.ts) and never changed after: message tags (first and last),
 *                         Canopi referral label, channel and campaign. For an account created on the DP site this is
 *                         how its signup started. Counts only (ballot-admin attribution --signups).
 *
 * Created on first write, like the other DP tables; reads never run DDL.
 */
import 'server-only';
import type pg from 'pg';
import { voteAttribution, type Arrival } from '@/lib/attribution/attribution-core';
import { getDpPool } from '@/lib/dp-db';

export const ACCOUNT_ATTRIBUTION_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS dp_account_attribution (
  user_id TEXT PRIMARY KEY,
  first_ref TEXT,
  last_ref TEXT,
  referral_code TEXT,
  referral_channel TEXT,
  utm_campaign TEXT,
  landed_at TIMESTAMPTZ,
  first_signin_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

let schemaReady: Promise<void> | null = null;

async function ensureSchema(pool: pg.Pool): Promise<void> {
  if (!schemaReady) {
    schemaReady = pool.query(ACCOUNT_ATTRIBUTION_SCHEMA_SQL).then(() => undefined);
    schemaReady.catch(() => {
      schemaReady = null;
    });
  }
  await schemaReady;
}

/** Best effort: sign-in never fails because of this. */
export async function recordAccountArrival(userId: string, arrival: Arrival | null): Promise<void> {
  if (!userId || !arrival) return;
  const pool = getDpPool();
  if (!pool) return;
  try {
    await ensureSchema(pool);
    const a = voteAttribution(arrival);
    await pool.query(
      `INSERT INTO dp_account_attribution (user_id, first_ref, last_ref, referral_code, referral_channel, utm_campaign, landed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId, a.firstRef, a.lastRef, a.referralCode, a.referralChannel, a.utmCampaign, a.landedAt],
    );
  } catch (err) {
    console.warn('[attribution] account arrival not recorded:', err instanceof Error ? err.message : err);
  }
}
