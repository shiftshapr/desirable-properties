import 'server-only';
import { randomUUID } from 'crypto';
import type pg from 'pg';
import { readSession } from '@/lib/auth-session';
import { DP_ROUNDUP_EVENTS } from '@/lib/dp-roundups';
import { BOOK_CLUB, bookClubHref, bookClubProposalKey } from '@/data/book-club';
import { getDpPool } from '@/lib/dp-db';
import { allowHit } from '@/lib/listening/rate-limit.server';
import { interimCouncil } from '@/lib/screening/council-members.server';
import { councilSeats, padVotesBackend, primeCouncilSeats, signalRows, writeSignal } from '@/lib/pad-votes/govhub.server';
import {
  LIMITS,
  nextSession,
  proposalsView,
  type ProposalDeps,
  type ProposalRow,
  type ProposalsView,
  type SupportRow,
  type TargetSession,
  type WriteResult,
} from '@/lib/next-proposals/core';
import { NEXT_PROPOSALS_SCHEMA_SQL } from '@/lib/next-proposals/schema';

const iso = (v: unknown): string | null => (v == null ? null : v instanceof Date ? v.toISOString() : String(v));

/** Community sessions (gatherings). Proposals show on each session's /roundups/<date> page, under #proposals. */
export function communityTargets(): TargetSession[] {
  return DP_ROUNDUP_EVENTS.filter((e) => e.kind === 'gathering').map((e) => ({
    date: e.date,
    title: e.meetingTitle || e.title,
    startsAt: e.startsAt,
    href: `/roundups/${e.date}`,
  }));
}

/** Book club meetings take proposals too, keyed book-club-<date>; they close when the meeting starts. */
export function bookClubTargets(): TargetSession[] {
  return BOOK_CLUB.meetings.map((m) => ({
    date: bookClubProposalKey(m.id),
    title: `${BOOK_CLUB.title}: ${m.chapter}`,
    startsAt: m.startsAt,
    href: bookClubHref(m.id, 'proposals'),
  }));
}

const allTargets = () => [...communityTargets(), ...bookClubTargets()];

let schemaReady: Promise<void> | null = null;
async function ensureSchema(pool: pg.Pool) {
  if (!schemaReady) {
    schemaReady = pool.query(NEXT_PROPOSALS_SCHEMA_SQL).then(() => undefined);
    schemaReady.catch(() => {
      schemaReady = null;
    });
  }
  await schemaReady;
}

async function tableExists(pool: pg.Pool) {
  const r = await pool.query(`SELECT to_regclass('public.dp_session_proposal_support') IS NOT NULL AS ok`);
  return Boolean(r.rows[0]?.ok);
}

async function rows(date: string): Promise<{ proposals: ProposalRow[]; supports: SupportRow[] }> {
  const pool = getDpPool();
  if (!pool || !(await tableExists(pool))) return { proposals: [], supports: [] };
  const p = await pool.query(
    `SELECT id, session_date, user_id, name, title, body, created_at, withdrawn_at, hidden_at, hidden_by_name, hidden_reason
       FROM dp_session_proposal WHERE session_date = $1 ORDER BY created_at`,
    [date],
  );
  const s = await pool.query(
    `SELECT s.proposal_id, s.user_id, s.name, s.created_at FROM dp_session_proposal_support s
       JOIN dp_session_proposal p ON p.id = s.proposal_id WHERE p.session_date = $1`,
    [date],
  );
  return {
    proposals: p.rows.map((r) => ({
      id: String(r.id),
      session_date: String(r.session_date),
      user_id: String(r.user_id),
      name: String(r.name),
      title: String(r.title),
      body: String(r.body),
      created_at: iso(r.created_at) || '',
      withdrawn_at: iso(r.withdrawn_at),
      hidden_at: iso(r.hidden_at),
      hidden_by_name: r.hidden_by_name == null ? null : String(r.hidden_by_name),
      hidden_reason: r.hidden_reason == null ? null : String(r.hidden_reason),
    })),
    supports: s.rows.map((r) => ({
      proposal_id: String(r.proposal_id),
      user_id: String(r.user_id),
      name: String(r.name),
      created_at: iso(r.created_at) || '',
    })),
  };
}

const UUID_RE = /^[0-9a-f-]{36}$/i;
/** The target session has not started, on the database clock ($1 is its startsAt). */
const OPEN = `now() < $1::timestamptz`;

async function pool(): Promise<pg.Pool> {
  const p = getDpPool();
  if (!p) throw new Error('DP database is not configured');
  await ensureSchema(p);
  return p;
}

const add: ProposalDeps['add'] = async (s, v, prop) => {
  const db = await pool();
  const r = await db.query(
    `INSERT INTO dp_session_proposal (id, session_date, user_id, name, title, body)
     SELECT $2, $3, $4, $5, $6, $7 WHERE ${OPEN}
       AND (SELECT count(*) FROM dp_session_proposal WHERE session_date = $3 AND user_id = $4
              AND withdrawn_at IS NULL AND hidden_at IS NULL) < $8`,
    [s.startsAt, randomUUID(), s.date, v.userId, prop.name, prop.title, prop.text, LIMITS.standingPerPersonPerSession],
  );
  if (r.rowCount) return { ok: true };
  const open = await db.query(`SELECT ${OPEN} AS open`, [s.startsAt]);
  return { ok: false, code: open.rows[0]?.open ? 'too_many' : 'closed' };
};

async function target(db: pg.Pool, s: TargetSession, id: string) {
  if (!UUID_RE.test(id)) return null;
  const r = await db.query(
    `SELECT user_id, withdrawn_at, hidden_at FROM dp_session_proposal WHERE id = $1 AND session_date = $2`,
    [id, s.date],
  );
  return r.rows[0] ?? null;
}

const support: ProposalDeps['support'] = async (s, v, id, name, on): Promise<WriteResult> => {
  const db = await pool();
  const row = await target(db, s, id);
  if (!row) return { ok: false, code: 'not_found' };
  if (row.withdrawn_at || row.hidden_at) return { ok: false, code: 'gone' };
  if (String(row.user_id) === v.userId) return { ok: false, code: 'own' };
  const r = on
    ? await db.query(
        `INSERT INTO dp_session_proposal_support (proposal_id, user_id, name) SELECT $2, $3, $4 WHERE ${OPEN}
         ON CONFLICT DO NOTHING`,
        [s.startsAt, id, v.userId, name],
      )
    : await db.query(`DELETE FROM dp_session_proposal_support WHERE proposal_id = $2 AND user_id = $3 AND ${OPEN}`, [
        s.startsAt,
        id,
        v.userId,
      ]);
  return r.rowCount ? { ok: true } : { ok: false, code: 'already' };
};

const withdraw: ProposalDeps['withdraw'] = async (s, v, id) => {
  const db = await pool();
  const row = await target(db, s, id);
  if (!row) return { ok: false, code: 'not_found' };
  if (String(row.user_id) !== v.userId) return { ok: false, code: 'not_yours' };
  if (row.withdrawn_at || row.hidden_at) return { ok: false, code: 'gone' };
  const r = await db.query(`UPDATE dp_session_proposal SET withdrawn_at = now() WHERE id = $2 AND withdrawn_at IS NULL AND ${OPEN}`, [
    s.startsAt,
    id,
  ]);
  return r.rowCount ? { ok: true } : { ok: false, code: 'closed' };
};

const hide: ProposalDeps['hide'] = async (s, m, id, reason) => {
  const db = await pool();
  const row = await target(db, s, id);
  if (!row) return { ok: false, code: 'not_found' };
  if (row.hidden_at) return { ok: false, code: 'already' };
  const r = await db.query(
    `UPDATE dp_session_proposal SET hidden_at = now(), hidden_by_user_id = $3, hidden_by_name = $4, hidden_reason = $5
      WHERE id = $2 AND hidden_at IS NULL AND ${OPEN}`,
    [s.startsAt, id, m.userId, m.name, reason],
  );
  return r.rowCount ? { ok: true } : { ok: false, code: 'closed' };
};

export const proposalDeps: ProposalDeps = {
  readSession: async () => {
    const s = await readSession();
    return s && s.userId ? { userId: s.userId, displayName: s.displayName } : null;
  },
  sessions: allTargets,
  members: interimCouncil,
  rows,
  add,
  support,
  withdraw,
  hide,
  allowHit: (key, max, windowMs) => allowHit(key, max, windowMs),
};

/** The session people can propose for now (the next one not yet started), or null. */
export function upcomingTarget(now = new Date()): TargetSession | null {
  return nextSession(communityTargets(), now);
}

/** For server pages: the view for one session date, or null. Database errors show an empty list. */
export async function readProposalsView(date: string): Promise<ProposalsView | null> {
  const session = allTargets().find((s) => s.date === date);
  if (!session) return null;
  const deps = await activeProposalDeps();
  const viewer = await deps.readSession().catch(() => null);
  return proposalsView(session, { ...deps, rows: (d) => deps.rows(d).catch(() => ({ proposals: [], supports: [] })) }, viewer);
}

/** Every session's proposals, for the ballot options pad. */
export async function readAllProposals(): Promise<{ session: TargetSession; proposals: ProposalsView['proposals'] }[]> {
  const out = [];
  for (const s of communityTargets()) {
    const v = await readProposalsView(s.date).catch(() => null);
    if (v && v.proposals.length) out.push({ session: s, proposals: v.proposals });
  }
  return out;
}

/* ---------------- Gov Hub as the store of record for supports (PAD_VOTES_BACKEND=govhub) ---------------- */
// The proposals themselves stay here (they are content, not votes); each support is a Gov Hub signal
// (pad_kind session_proposal, pad_ref = proposal id), named by design.

async function govhubRowsFor(date: string): Promise<{ proposals: ProposalRow[]; supports: SupportRow[] }> {
  const { proposals } = await rows(date);
  const signals = await signalRows('session_proposal', proposals.map((p) => p.id));
  return {
    proposals,
    supports: signals
      .filter((r) => !r.superseded_at)
      .map((r) => ({ proposal_id: r.pad_ref, user_id: r.user_id, name: r.name, created_at: r.created_at })),
  };
}

const govhubSupport: ProposalDeps['support'] = async (s, v, id, _name, on): Promise<WriteResult> => {
  const db = await pool();
  const row = await target(db, s, id);
  if (!row) return { ok: false, code: 'not_found' };
  if (row.withdrawn_at || row.hidden_at) return { ok: false, code: 'gone' };
  if (String(row.user_id) === v.userId) return { ok: false, code: 'own' };
  if (Date.now() >= new Date(s.startsAt).getTime()) return { ok: false, code: 'closed' };
  const r = await writeSignal('session_proposal', id, {}, on ? 'POST' : 'DELETE');
  if (r.ok) return { ok: true };
  throw new Error(`Gov Hub support: ${r.status} ${String(r.data.code || '')}`);
};

const govhubProposalDeps: ProposalDeps = {
  ...proposalDeps,
  members: councilSeats,
  rows: govhubRowsFor,
  support: govhubSupport,
};

/** The deps for this request: Gov Hub supports and council seats when PAD_VOTES_BACKEND=govhub. */
export async function activeProposalDeps(): Promise<ProposalDeps> {
  if (padVotesBackend() !== 'govhub') return proposalDeps;
  await primeCouncilSeats();
  return govhubProposalDeps;
}
