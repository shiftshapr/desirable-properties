import 'server-only';
import type pg from 'pg';
import { readSession } from '@/lib/auth-session';
import { SESSION_BALLOTS } from '@/data/sessions/2026-11-16-ballot';
import type { BallotDefinition, BallotDeps, BallotOverride, SaveResult, VoteRow } from '@/lib/ballots/ballot-core';
import { BALLOT_SCHEMA_SQL } from '@/lib/ballots/ballot-schema';
import { getDpPool } from '@/lib/dp-db';
import { allowHit } from '@/lib/listening/rate-limit.server';

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

export async function getBallotOverride(slug: string): Promise<BallotOverride> {
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
    return { ok: true, savedAt: iso(b.rows[0].now) || new Date().toISOString() };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
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

export const ballotDeps: BallotDeps = {
  readSession: async () => {
    const s = await readSession();
    return s ? { userId: s.userId, username: s.username, displayName: s.displayName } : null;
  },
  getDefinition: (slug) => SESSION_BALLOTS[slug] ?? null,
  getOverride: (slug) => getBallotOverride(slug).catch(() => null),
  myVotes,
  saveVotes,
  resultRows: async (slug) => {
    const pool = getDpPool();
    return pool ? ballotVoteRows(pool, slug) : [];
  },
  allowHit: (key, max, windowMs) => allowHit(key, max, windowMs),
};
