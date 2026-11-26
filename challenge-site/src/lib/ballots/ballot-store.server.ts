import 'server-only';
import type pg from 'pg';
import { cookies } from 'next/headers';
import { readSession } from '@/lib/auth-session';
import { ARRIVAL_COOKIE, decodeArrival, voteAttribution } from '@/lib/attribution/attribution-core';
import { SESSION_BALLOTS } from '@/data/sessions/ballots';
import type { BallotDefinition, BallotDeps, BallotOverride, ResolvedBallot, SaveResult, VoteRow } from '@/lib/ballots/ballot-core';
import { applyScreening } from '@/lib/ballots/ballot-screening-core';
import { SESSION_SCREENINGS } from '@/data/sessions/2026-11-23-screening';
import { activeScreeningDeps } from '@/lib/screening/screening-store.server';
import { screenQuestions } from '@/lib/screening/screening-core';
import { BALLOT_SCHEMA_SQL } from '@/lib/ballots/ballot-schema';
import { getDpPool } from '@/lib/dp-db';
import { allowHit } from '@/lib/listening/rate-limit.server';
import { forgetPublic, PAD_VOTES_SCOPE, padVotesBackend, padVotesFetch, padVotesPublic } from '@/lib/pad-votes/govhub.server';
import type { BallotResults } from '@/lib/ballots/ballot-core';

/** Real dependencies for the ballot handlers (ballot-core.ts). Reads never create tables. */

const iso = (v: unknown): string | null => (v == null ? null : v instanceof Date ? v.toISOString() : String(v));

let schemaReady: Promise<void> | null = null;

async function ensureSchema(pool: pg.Pool): Promise<void> {
  if (!schemaReady) {
    schemaReady = pool.query(BALLOT_SCHEMA_SQL).then(() => undefined);
    schemaReady.catch(() => {
      schemaReady = null;
    });
  }
  await schemaReady;
}

async function tableExists(pool: pg.Pool, table: 'dp_ballot' | 'dp_ballot_vote'): Promise<boolean> {
  const r = await pool.query(`SELECT to_regclass($1) IS NOT NULL AS ok`, [`public.${table}`]);
  return Boolean(r.rows[0]?.ok);
}

/* ---------------- Screened ballots: what can be voted on ---------------- */

/** Final outcomes never change after the screening close (screenQuestions ignores later rows), so keep them. */
const resolvedCache = new Map<string, ResolvedBallot>();

/**
 * The questions open to a vote. A ballot without screening: itself. A screened ballot: nothing before the screening
 * close; after it, the questions with no standing objection at the close (and the held-back ones with reasons).
 * Throws when the screening record cannot be read: callers treat that as unavailable (fail closed), never as
 * "no objections".
 */
export async function resolveBallot(def: BallotDefinition, now = new Date()): Promise<ResolvedBallot> {
  if (!def.screenedBy) return { state: 'ready', votable: def, heldBack: [] };
  if (now.getTime() < new Date(def.opensAt).getTime()) return { state: 'pending' };
  const hit = resolvedCache.get(def.slug);
  if (hit && Date.now() >= new Date(def.opensAt).getTime()) return hit;
  const sdef = SESSION_SCREENINGS[def.screenedBy];
  if (!sdef) throw new Error(`${def.slug}: unknown screening ${def.screenedBy}`);
  if (sdef.closesAt !== new Date(def.opensAt).toISOString()) throw new Error(`${def.slug}: opensAt must be the screening close`);
  const deps = await activeScreeningDeps();
  const rows = await deps.rows(sdef.slug); // no catch: an unreadable record must not read as "no objections"
  const resolved = applyScreening(def, screenQuestions(sdef, rows, now), now);
  // Only a real-clock outcome is kept: a staging preview of a later time (asOf) must never fix the ballot early.
  if (Date.now() >= new Date(def.opensAt).getTime()) resolvedCache.set(def.slug, resolved);
  return resolved;
}

export async function getBallotOverride(slug: string): Promise<BallotOverride> {
  if (padVotesBackend() === 'govhub') return govhubOverride(slug);
  const pool = getDpPool();
  if (!pool || !(await tableExists(pool, 'dp_ballot'))) return null;
  const r = await pool.query('SELECT status, published_at FROM dp_ballot WHERE slug = $1', [slug]);
  const row = r.rows[0];
  if (!row || (row.status !== 'closed' && row.status !== 'published')) return null;
  return { status: row.status, publishedAt: iso(row.published_at) };
}

async function myVotes(slug: string, userId: string): Promise<Record<string, string>> {
  const pool = getDpPool();
  if (!pool || !userId || !(await tableExists(pool, 'dp_ballot_vote'))) return {};
  const r = await pool.query(
    'SELECT question_key, option_key FROM dp_ballot_vote WHERE ballot_slug = $1 AND user_id = $2',
    [slug, userId],
  );
  return Object.fromEntries(r.rows.map((row) => [String(row.question_key), String(row.option_key)]));
}

async function saveVotes(def: BallotDefinition, userId: string, votes: Record<string, string>): Promise<SaveResult> {
  const pool = getDpPool();
  if (!pool) throw new Error('DP database is not configured');
  await ensureSchema(pool);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Window on the database clock, and no early stop. A concurrent `ballot-admin close` takes a row lock on
    // dp_ballot, so the FOR SHARE read waits for it.
    const b = await client.query(
      `SELECT now() AS now, now() >= $2::timestamptz AND now() < $3::timestamptz AS in_window,
              (SELECT status FROM dp_ballot WHERE slug = $1 FOR SHARE) AS override`,
      [def.slug, def.opensAt, def.closesAt],
    );
    if (!b.rows[0]?.in_window || b.rows[0]?.override) {
      await client.query('ROLLBACK');
      return { ok: false, code: 'not_open' };
    }
    const first = await client.query('SELECT 1 FROM dp_ballot_vote WHERE ballot_slug = $1 AND user_id = $2 LIMIT 1', [def.slug, userId]);
    const isFirstSubmission = first.rowCount === 0;
    for (const [question, option] of Object.entries(votes)) {
      await client.query(
        `INSERT INTO dp_ballot_vote (ballot_slug, question_key, user_id, option_key)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (ballot_slug, question_key, user_id)
         DO UPDATE SET option_key = EXCLUDED.option_key, updated_at = now()`,
        [def.slug, question, userId, option],
      );
    }
    await client.query('COMMIT');
    if (isFirstSubmission) await recordVoteAttribution(pool, def.slug, userId);
    return { ok: true, savedAt: iso(b.rows[0].now) || new Date().toISOString() };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * How the account arrived, stored once with its first submission (never on later edits). Best effort: the vote is
 * already committed, and a failure here only loses the attribution.
 */
async function recordVoteAttribution(pool: pg.Pool, slug: string, userId: string): Promise<void> {
  try {
    const a = voteAttribution(decodeArrival((await cookies()).get(ARRIVAL_COOKIE)?.value));
    await pool.query(
      `INSERT INTO dp_ballot_vote_attribution
         (ballot_slug, user_id, first_ref, last_ref, referral_code, referral_channel, utm_campaign, landed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (ballot_slug, user_id) DO NOTHING`,
      [slug, userId, a.firstRef, a.lastRef, a.referralCode, a.referralChannel, a.utmCampaign, a.landedAt],
    );
  } catch (err) {
    console.warn('[ballot] attribution not recorded:', err instanceof Error ? err.message : err);
  }
}

export async function ballotVoteRows(pool: pg.Pool, slug: string): Promise<VoteRow[]> {
  if (!(await tableExists(pool, 'dp_ballot_vote'))) return [];
  const r = await pool.query('SELECT question_key, option_key, user_id FROM dp_ballot_vote WHERE ballot_slug = $1', [slug]);
  return r.rows.map((row) => ({
    question_key: String(row.question_key),
    option_key: String(row.option_key),
    user_id: String(row.user_id),
  }));
}

function ballotDepsDp(): BallotDeps {
  return ballotDeps;
}

export const ballotDeps: BallotDeps = {
  readSession: async () => {
    const s = await readSession();
    return s ? { userId: s.userId, username: s.username, displayName: s.displayName } : null;
  },
  getDefinition: (slug) => SESSION_BALLOTS[slug] ?? null,
  getOverride: (slug) => getBallotOverride(slug).catch(() => null),
  resolve: (def, now) => resolveBallot(def, now),
  myVotes,
  saveVotes,
  resultRows: async (slug) => {
    const pool = getDpPool();
    return pool ? ballotVoteRows(pool, slug) : [];
  },
  allowHit: (key, max, windowMs) => allowHit(key, max, windowMs),
};

/* ---------------- Gov Hub as the store of record (PAD_VOTES_BACKEND=govhub) ---------------- */

type GhBallot = {
  slug: string;
  status: 'scheduled' | 'open' | 'closed' | 'counted' | 'published' | 'cancelled';
  closes_at: string;
  published_at: string | null;
  definition_sha256: string;
  results: BallotResults | null;
};

const registered = new Map<string, number>();
const REGISTER_MS = 10 * 60_000;

/**
 * Register (or confirm) the definition in code with Gov Hub. Gov Hub refuses a change once the ballot has opened.
 * A screened ballot is registered only after its screening has closed, with the questions that went to the ballot:
 * it is created already open, so Gov Hub never holds a question that the council held back. Returns false when a
 * screened ballot could not be registered (not yet, or the screening record could not be read).
 */
async function ensureRegistered(slug: string): Promise<boolean> {
  const def = SESSION_BALLOTS[slug];
  if (!def) return true;
  const at = registered.get(slug);
  if (at && Date.now() - at < REGISTER_MS) return true;
  let body: BallotDefinition = def;
  if (def.screenedBy) {
    const resolved = await resolveBallot(def).catch((err) => {
      console.error('[pad-votes] screening outcome unreadable; ballot not registered:', slug, err instanceof Error ? err.message : err);
      return null;
    });
    if (!resolved || resolved.state !== 'ready') return false;
    if (!resolved.votable.questions.length) return false; // the council held back every question: nothing to vote on
    body = resolved.votable;
  }
  const r = await padVotesFetch(`/admin/${PAD_VOTES_SCOPE}/ballots`, {
    as: 'admin',
    method: 'POST',
    body: { ...body, eligibility: { rule: 'signed_in' } },
  });
  if (r.ok) {
    registered.set(slug, Date.now());
    forgetPublic(`/ballots/${PAD_VOTES_SCOPE}/${slug}`);
  } else if (!r.unavailable) {
    // ballot_frozen: the definition in code differs from the one people voted on. Gov Hub keeps its own.
    console.error('[pad-votes] ballot registration refused:', slug, r.status, String(r.data.code || ''));
    registered.set(slug, Date.now());
  }
  return true;
}

async function ghBallot(slug: string): Promise<GhBallot | 'unavailable' | null> {
  await ensureRegistered(slug);
  const r = await padVotesPublic<GhBallot>(`/ballots/${PAD_VOTES_SCOPE}/${encodeURIComponent(slug)}`);
  if (r.ok) return r.data;
  return r.unavailable ? 'unavailable' : null;
}

async function govhubOverride(slug: string): Promise<BallotOverride> {
  const b = await ghBallot(slug);
  if (b === 'unavailable') return { status: 'unavailable', publishedAt: null };
  if (!b) {
    // A screened ballot past its opening that Gov Hub does not hold yet: voting cannot be recorded, so say so.
    const def = SESSION_BALLOTS[slug];
    if (def?.screenedBy && Date.now() >= new Date(def.opensAt).getTime()) return { status: 'unavailable', publishedAt: null };
    return null;
  }
  const status =
    b.status === 'published' ? 'published' : b.status === 'open' ? 'open' : b.status === 'scheduled' ? 'scheduled' : 'closed';
  return { status, publishedAt: b.published_at, closesAt: b.closes_at };
}

async function govhubMyVotes(slug: string): Promise<Record<string, string>> {
  const r = await padVotesFetch<{ my_choices: Record<string, string> }>(`/ballots/${PAD_VOTES_SCOPE}/${encodeURIComponent(slug)}/me`, {
    as: 'user',
  });
  return r.ok ? r.data.my_choices || {} : {};
}

async function govhubSaveVotes(def: BallotDefinition, _userId: string, votes: Record<string, string>): Promise<SaveResult> {
  if (!(await ensureRegistered(def.slug))) return { ok: false, code: 'unavailable' };
  const r = await padVotesFetch<{ cast_at: string }>(`/ballots/${PAD_VOTES_SCOPE}/${encodeURIComponent(def.slug)}/vote`, {
    as: 'user',
    method: 'POST',
    body: { votes },
  });
  if (r.ok) {
    forgetPublic(`/ballots/${PAD_VOTES_SCOPE}/${def.slug}`);
    return { ok: true, savedAt: r.data.cast_at || new Date().toISOString() };
  }
  if (r.unavailable) return { ok: false, code: 'unavailable' };
  if (r.status === 403 && r.data.code === 'not_eligible') return { ok: false, code: 'not_eligible' };
  if (r.status === 409) return { ok: false, code: 'not_open' };
  throw new Error(`Gov Hub refused the vote: ${r.status} ${String(r.data.code || '')}`);
}

async function govhubResults(def: BallotDefinition): Promise<BallotResults | null> {
  const b = await ghBallot(def.slug);
  return b && b !== 'unavailable' ? b.results : null;
}

const govhubBallotDeps: BallotDeps = {
  ...ballotDepsDp(),
  getOverride: (slug) => govhubOverride(slug).catch(() => ({ status: 'unavailable', publishedAt: null }) as BallotOverride),
  myVotes: govhubMyVotes,
  saveVotes: govhubSaveVotes,
  resultRows: async () => [],
  results: govhubResults,
};

/** The deps the ballot route uses: Gov Hub when PAD_VOTES_BACKEND=govhub, else the DP site's Postgres. */
export function activeBallotDeps(): BallotDeps {
  return padVotesBackend() === 'govhub' ? govhubBallotDeps : ballotDeps;
}
