import 'server-only';
import type pg from 'pg';
import { SESSION_BALLOTS } from '@/data/sessions/2026-11-16-ballot';
import {
  participation,
  publicParticipation,
  type ParticipationBallot,
  type ParticipationRow,
  type PublicParticipation,
  type VoterParticipation,
} from '@/lib/ballots/participation-core';
import { VOTER_MERGE, voterName } from '@/lib/ballots/voter-names.server';
import { getDpPool } from '@/lib/dp-db';

/**
 * Voter participation, computed from dp_ballot_vote at request time (cached for a minute). The SQL aggregates per
 * ballot and account, so only counts leave the database, never a choice. The one stored setting is whether an
 * account's name shows on the public list (dp_voter_setting; no row means shown).
 */

export const VOTER_SETTING_SQL = `
CREATE TABLE IF NOT EXISTS dp_voter_setting (
  user_id TEXT PRIMARY KEY,
  show_name BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

const BALLOTS: ParticipationBallot[] = Object.values(SESSION_BALLOTS).map((b) => ({ slug: b.slug, closesAt: b.closesAt }));
const CACHE_MS = 60_000;
let cache: { at: number; voters: VoterParticipation[]; hidden: Set<string> } | null = null;

async function tableExists(pool: pg.Pool, table: string): Promise<boolean> {
  const r = await pool.query(`SELECT to_regclass($1) IS NOT NULL AS ok`, [`public.${table}`]);
  return Boolean(r.rows[0]?.ok);
}

async function load(): Promise<{ voters: VoterParticipation[]; hidden: Set<string> }> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache;
  const pool = getDpPool();
  if (!pool || !(await tableExists(pool, 'dp_ballot_vote'))) return { voters: [], hidden: new Set() };
  const r = await pool.query(
    `SELECT ballot_slug, user_id, count(*) FILTER (WHERE option_key <> 'abstain')::int AS non_abstain
       FROM dp_ballot_vote GROUP BY ballot_slug, user_id`,
  );
  const rows: ParticipationRow[] = r.rows.map((x) => ({
    ballot_slug: String(x.ballot_slug),
    user_id: String(x.user_id),
    non_abstain: Number(x.non_abstain) || 0,
  }));
  const hidden = new Set<string>();
  if (await tableExists(pool, 'dp_voter_setting')) {
    const h = await pool.query('SELECT user_id FROM dp_voter_setting WHERE show_name = false');
    for (const x of h.rows) hidden.add(VOTER_MERGE[String(x.user_id)] ?? String(x.user_id));
  }
  cache = { at: Date.now(), voters: participation(BALLOTS, rows, new Date(), VOTER_MERGE), hidden };
  return cache;
}

/** The public list (names only where on record and not hidden; never a choice). Empty when the DB is unreachable. */
export async function readPublicParticipation(): Promise<PublicParticipation> {
  const { voters, hidden } = await load().catch(() => ({ voters: [] as VoterParticipation[], hidden: new Set<string>() }));
  return publicParticipation(voters, voterName, hidden);
}

/** One account's own stats and setting (account page). */
export async function readMyParticipation(userId: string): Promise<{ stats: VoterParticipation | null; showName: boolean; nameOnRecord: boolean }> {
  const id = VOTER_MERGE[userId] ?? userId;
  const { voters } = await load();
  const pool = getDpPool();
  let showName = true;
  if (pool && (await tableExists(pool, 'dp_voter_setting'))) {
    const r = await pool.query('SELECT show_name FROM dp_voter_setting WHERE user_id = $1', [userId]);
    if (r.rows[0]) showName = Boolean(r.rows[0].show_name);
  }
  return { stats: voters.find((v) => v.userId === id) ?? null, showName, nameOnRecord: Boolean(voterName(id)) };
}

export async function saveShowName(userId: string, showName: boolean): Promise<void> {
  const pool = getDpPool();
  if (!pool) throw new Error('DP database is not configured');
  await pool.query(VOTER_SETTING_SQL);
  await pool.query(
    `INSERT INTO dp_voter_setting (user_id, show_name) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET show_name = EXCLUDED.show_name, updated_at = now()`,
    [userId, showName],
  );
  cache = null;
}
