import 'server-only';
import { randomUUID } from 'crypto';
import type pg from 'pg';
import { readSession } from '@/lib/auth-session';
import { SESSION_SCREENINGS } from '@/data/sessions/2026-11-23-screening';
import { interimCouncil } from '@/lib/screening/council-members.server';
import {
  screeningView,
  type CouncilMember,
  type ObjectionRow,
  type ScreeningDefinition,
  type ScreeningDeps,
  type ScreeningView,
  type WriteResult,
} from '@/lib/screening/screening-core';
import { SCREENING_SCHEMA_SQL } from '@/lib/screening/screening-schema';
import { getDpPool } from '@/lib/dp-db';
import { allowHit } from '@/lib/listening/rate-limit.server';

/** Real dependencies for the screening handlers (screening-core.ts). Reads never create tables. */

const iso = (v: unknown): string | null => (v == null ? null : v instanceof Date ? v.toISOString() : String(v));

let schemaReady: Promise<void> | null = null;

async function ensureSchema(pool: pg.Pool): Promise<void> {
  if (!schemaReady) {
    schemaReady = pool.query(SCREENING_SCHEMA_SQL).then(() => undefined);
    schemaReady.catch(() => {
      schemaReady = null;
    });
  }
  await schemaReady;
}

async function tableExists(pool: pg.Pool): Promise<boolean> {
  const r = await pool.query(`SELECT to_regclass('public.dp_screening_objection') IS NOT NULL AS ok`);
  return Boolean(r.rows[0]?.ok);
}

async function rows(slug: string): Promise<ObjectionRow[]> {
  const pool = getDpPool();
  if (!pool || !(await tableExists(pool))) return [];
  const r = await pool.query(
    `SELECT id, question_key, member_user_id, member_name, reason, created_at, withdrawn_at
       FROM dp_screening_objection WHERE ballot_slug = $1 ORDER BY created_at`,
    [slug],
  );
  return r.rows.map((row) => ({
    id: String(row.id),
    question_key: String(row.question_key),
    member_user_id: String(row.member_user_id),
    member_name: String(row.member_name),
    reason: String(row.reason),
    created_at: iso(row.created_at) || '',
    withdrawn_at: iso(row.withdrawn_at),
  }));
}

/** Window on the database clock: from the draft going visible until the screening close. */
const IN_WINDOW = `now() >= $1::timestamptz AND now() < $2::timestamptz`;

async function addObjection(def: ScreeningDefinition, member: CouncilMember, questionKey: string, reason: string): Promise<WriteResult> {
  const pool = getDpPool();
  if (!pool) throw new Error('DP database is not configured');
  await ensureSchema(pool);
  try {
    const r = await pool.query(
      `INSERT INTO dp_screening_objection (id, ballot_slug, question_key, member_user_id, member_name, reason)
       SELECT $3, $4, $5, $6, $7, $8 WHERE ${IN_WINDOW}`,
      [def.opensAt, def.closesAt, randomUUID(), def.slug, questionKey, member.userId, member.name, reason],
    );
    return r.rowCount ? { ok: true } : { ok: false, code: 'closed' };
  } catch (err) {
    // The partial unique index: one standing objection per member per question.
    if ((err as { code?: string }).code === '23505') return { ok: false, code: 'already' };
    throw err;
  }
}

async function withdrawObjection(def: ScreeningDefinition, member: CouncilMember, id: string): Promise<WriteResult> {
  const pool = getDpPool();
  if (!pool || !(await tableExists(pool))) return { ok: false, code: 'not_found' };
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, code: 'not_found' };
  const r = await pool.query(
    `UPDATE dp_screening_objection SET withdrawn_at = now()
      WHERE id = $3 AND ballot_slug = $4 AND member_user_id = $5 AND withdrawn_at IS NULL AND ${IN_WINDOW}
      RETURNING id`,
    [def.opensAt, def.closesAt, id, def.slug, member.userId],
  );
  if (r.rowCount) return { ok: true };
  // Say why it did not apply.
  const c = await pool.query(
    `SELECT member_user_id, withdrawn_at, ${IN_WINDOW} AS open FROM dp_screening_objection WHERE id = $3 AND ballot_slug = $4`,
    [def.opensAt, def.closesAt, id, def.slug],
  );
  const row = c.rows[0];
  if (!row) return { ok: false, code: 'not_found' };
  if (String(row.member_user_id) !== member.userId) return { ok: false, code: 'not_yours' };
  if (row.withdrawn_at) return { ok: false, code: 'already_withdrawn' };
  return { ok: false, code: 'closed' };
}

export const screeningDeps: ScreeningDeps = {
  readSession: async () => {
    const s = await readSession();
    return s && s.userId ? { userId: s.userId } : null;
  },
  getDefinition: (slug) => SESSION_SCREENINGS[slug] ?? null,
  members: interimCouncil,
  rows,
  addObjection,
  withdrawObjection,
  allowHit: (key, max, windowMs) => allowHit(key, max, windowMs),
};

/** For the session page (server): the same payload as GET, or null when the session has no screening. */
export async function readScreeningView(slug: string): Promise<ScreeningView | null> {
  const def = SESSION_SCREENINGS[slug];
  if (!def) return null;
  const viewer = await screeningDeps.readSession().catch(() => null);
  return screeningView(def, { ...screeningDeps, rows: (s) => rows(s).catch(() => []) }, viewer);
}
