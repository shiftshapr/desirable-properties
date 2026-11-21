/**
 * Pad tables (DP Postgres), created on first write the way the ballot tables are (ballot-store.server.ts); reads never
 * run DDL. pad_kind keeps the tables usable by other pad types (meeting pads) later.
 *
 * dp_pad_advisory  one current Support / Concern per (pad, account); a change overwrites the row (no history kept).
 * dp_pad_follow    one row per (pad, account) following it, with the email to write to and the status the follower
 *                  last heard about (the sweep compares it with Gov Hub and emails on a change).
 */
import 'server-only';
import type pg from 'pg';
import { readSession } from '@/lib/auth-session';
import { getDpPool } from '@/lib/dp-db';
import { allowHit } from '@/lib/listening/rate-limit.server';
import type { AdvisoryRow, CommunityDeps, FollowRow, PadKind, PadSession, Stance } from '@/lib/pads/pad-community-core';
import { findPadProposal } from '@/lib/pads/proposal-pad.server';

export const PAD_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS dp_pad_advisory (
  pad_kind TEXT NOT NULL,
  pad_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  stance TEXT NOT NULL CHECK (stance IN ('support', 'concern')),
  reason TEXT,
  show_name BOOLEAN NOT NULL DEFAULT false,
  display_name TEXT,
  cast_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (pad_kind, pad_id, user_id)
);

CREATE TABLE IF NOT EXISTS dp_pad_follow (
  pad_kind TEXT NOT NULL,
  pad_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT,
  ml_number TEXT NOT NULL,
  dp_id TEXT,
  last_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_notified_at TIMESTAMPTZ,
  PRIMARY KEY (pad_kind, pad_id, user_id)
);

CREATE INDEX IF NOT EXISTS dp_pad_follow_ml ON dp_pad_follow (pad_kind, ml_number);
`;

let schemaReady: Promise<void> | null = null;

async function ensureSchema(pool: pg.Pool): Promise<void> {
  if (!schemaReady) {
    schemaReady = pool.query(PAD_SCHEMA_SQL).then(() => undefined);
    schemaReady.catch(() => {
      schemaReady = null;
    });
  }
  await schemaReady;
}

async function tableExists(pool: pg.Pool, table: 'dp_pad_advisory' | 'dp_pad_follow'): Promise<boolean> {
  const r = await pool.query('SELECT to_regclass($1) IS NOT NULL AS ok', [`public.${table}`]);
  return Boolean(r.rows[0]?.ok);
}

const iso = (v: unknown): string => (v instanceof Date ? v.toISOString() : String(v ?? ''));

export async function advisoryRows(kind: PadKind, padId: string): Promise<AdvisoryRow[]> {
  const pool = getDpPool();
  if (!pool || !(await tableExists(pool, 'dp_pad_advisory'))) return [];
  const r = await pool.query(
    `SELECT user_id, stance, reason, show_name, display_name, updated_at FROM dp_pad_advisory
     WHERE pad_kind = $1 AND pad_id = $2`,
    [kind, padId],
  );
  return r.rows.map((row) => ({
    user_id: String(row.user_id),
    stance: row.stance as Stance,
    reason: row.reason ? String(row.reason) : null,
    show_name: Boolean(row.show_name),
    display_name: row.display_name ? String(row.display_name) : null,
    updated_at: iso(row.updated_at),
  }));
}

async function saveAdvisory(
  kind: PadKind,
  padId: string,
  session: PadSession,
  v: { stance: Stance; reason: string | null; showName: boolean } | null,
): Promise<void> {
  const pool = getDpPool();
  if (!pool) throw new Error('DP database is not configured');
  await ensureSchema(pool);
  if (!v) {
    await pool.query('DELETE FROM dp_pad_advisory WHERE pad_kind = $1 AND pad_id = $2 AND user_id = $3', [
      kind,
      padId,
      session.userId,
    ]);
    return;
  }
  await pool.query(
    `INSERT INTO dp_pad_advisory (pad_kind, pad_id, user_id, stance, reason, show_name, display_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (pad_kind, pad_id, user_id) DO UPDATE SET stance = EXCLUDED.stance, reason = EXCLUDED.reason,
       show_name = EXCLUDED.show_name, display_name = EXCLUDED.display_name, updated_at = now()`,
    [kind, padId, session.userId, v.stance, v.reason, v.showName, (session.displayName || session.username || '').slice(0, 120) || null],
  );
}

async function isFollowing(kind: PadKind, padId: string, userId: string): Promise<boolean> {
  const pool = getDpPool();
  if (!pool || !(await tableExists(pool, 'dp_pad_follow'))) return false;
  const r = await pool.query('SELECT 1 FROM dp_pad_follow WHERE pad_kind = $1 AND pad_id = $2 AND user_id = $3', [
    kind,
    padId,
    userId,
  ]);
  return r.rowCount === 1;
}

async function setFollow(
  kind: PadKind,
  pad: { id: string; status: string; mlNumber: string; dpId: string | null },
  session: PadSession,
  on: boolean,
): Promise<void> {
  const pool = getDpPool();
  if (!pool) throw new Error('DP database is not configured');
  await ensureSchema(pool);
  if (!on) {
    await pool.query('DELETE FROM dp_pad_follow WHERE pad_kind = $1 AND pad_id = $2 AND user_id = $3', [kind, pad.id, session.userId]);
    return;
  }
  await pool.query(
    `INSERT INTO dp_pad_follow (pad_kind, pad_id, user_id, email, display_name, ml_number, dp_id, last_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (pad_kind, pad_id, user_id) DO UPDATE SET email = EXCLUDED.email, display_name = EXCLUDED.display_name`,
    [
      kind,
      pad.id,
      session.userId,
      String(session.email || '').trim().toLowerCase(),
      (session.displayName || session.username || '').slice(0, 120) || null,
      pad.mlNumber,
      pad.dpId,
      String(pad.status || '').toLowerCase(),
    ],
  );
}

/** Every follow, for the sweep. */
export async function allFollows(kind: PadKind): Promise<FollowRow[]> {
  const pool = getDpPool();
  if (!pool || !(await tableExists(pool, 'dp_pad_follow'))) return [];
  const r = await pool.query(
    'SELECT pad_id, user_id, email, display_name, ml_number, dp_id, last_status FROM dp_pad_follow WHERE pad_kind = $1',
    [kind],
  );
  return r.rows.map((row) => ({
    pad_id: String(row.pad_id),
    user_id: String(row.user_id),
    email: String(row.email),
    display_name: row.display_name ? String(row.display_name) : null,
    ml_number: String(row.ml_number),
    dp_id: row.dp_id ? String(row.dp_id) : null,
    last_status: String(row.last_status),
  }));
}

export async function markNotified(kind: PadKind, padId: string, userId: string, status: string): Promise<void> {
  const pool = getDpPool();
  if (!pool) return;
  await pool.query(
    `UPDATE dp_pad_follow SET last_status = $4, last_notified_at = now() WHERE pad_kind = $1 AND pad_id = $2 AND user_id = $3`,
    [kind, padId, userId, status],
  );
}

export const padCommunityDeps: CommunityDeps = {
  readSession: async () => {
    const s = await readSession();
    return s ? { userId: s.userId, displayName: s.displayName, username: s.username, email: s.email ?? null } : null;
  },
  resolvePad: async (rawId, mlHint) => {
    const found = await findPadProposal(rawId, mlHint).catch(() => null);
    return found
      ? { id: found.proposal.id, status: String(found.proposal.status || ''), mlNumber: found.doc.mlNumber, dpId: found.doc.dpId }
      : null;
  },
  advisoryRows,
  saveAdvisory,
  isFollowing,
  setFollow,
  allowHit: (key, max, windowMs) => allowHit(key, max, windowMs),
};
