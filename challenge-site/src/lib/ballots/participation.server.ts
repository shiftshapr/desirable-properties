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
import { PAD_VOTES_SCOPE, padVotesBackend, padVotesFetch, padVotesPublic } from '@/lib/pad-votes/govhub.server';

/**
 * Voter participation, computed from dp_ballot_vote at request time (cached for a minute). The SQL lists only which
 * accounts voted on which ballot, never a choice. With PAD_VOTES_BACKEND=govhub it comes from Gov Hub instead. The one stored setting is whether an
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
    `SELECT DISTINCT ballot_slug, user_id FROM dp_ballot_vote`,
  );
  const rows: ParticipationRow[] = r.rows.map((x) => ({ ballot_slug: String(x.ballot_slug), user_id: String(x.user_id) }));
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
  if (padVotesBackend() === 'govhub') {
    type Gh = { voters: number; listed: { name: string; ballots: number; current_streak: number; longest_streak: number }[]; others: number };
    const r = await padVotesPublic<Gh>(`/participation/${PAD_VOTES_SCOPE}`);
    if (!r.ok) return { voters: 0, listed: [], others: 0, stale: true };
    return {
      voters: r.data.voters,
      listed: r.data.listed.map((v) => ({ name: v.name, ballots: v.ballots, currentStreak: v.current_streak, longestStreak: v.longest_streak })),
      others: r.data.others,
      ...(r.stale ? { stale: true } : {}),
    };
  }
  const { voters, hidden } = await load().catch(() => ({ voters: [] as VoterParticipation[], hidden: new Set<string>() }));
  return publicParticipation(voters, voterName, hidden);
}

/** One account's own stats and setting (account page). */
type GhMine = {
  stats: { ballots: string[]; current_streak: number; longest_streak: number } | null;
  show_name: boolean;
  name_on_record: boolean;
};

function fromGhMine(userId: string, d: GhMine): { stats: VoterParticipation | null; showName: boolean; nameOnRecord: boolean } {
  return {
    stats: d.stats
      ? { userId, ballots: d.stats.ballots.map((slug) => ({ slug })), currentStreak: d.stats.current_streak, longestStreak: d.stats.longest_streak }
      : null,
    showName: d.show_name,
    nameOnRecord: d.name_on_record,
  };
}

export async function readMyParticipation(userId: string): Promise<{ stats: VoterParticipation | null; showName: boolean; nameOnRecord: boolean }> {
  if (padVotesBackend() === 'govhub') {
    const r = await padVotesFetch<GhMine>(`/participation/${PAD_VOTES_SCOPE}/me`, { as: 'user' });
    if (!r.ok) throw new Error(`Gov Hub participation: ${r.status}`);
    return fromGhMine(userId, r.data);
  }
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
  if (padVotesBackend() === 'govhub') {
    const r = await padVotesFetch(`/participation/${PAD_VOTES_SCOPE}/me`, { as: 'user', method: 'POST', body: { show_name: showName } });
    if (!r.ok) throw new Error(`Gov Hub participation setting: ${r.status}`);
    return;
  }
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
