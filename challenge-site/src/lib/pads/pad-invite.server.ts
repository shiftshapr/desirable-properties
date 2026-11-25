/**
 * "Invite others" server side: the invite content for each pad kind, the rate-limit store, the opt-out link and the
 * Resend send. The rules live in pad-invite-core.ts.
 *
 * dp_pad_invite_send  one row per address tried: sender account, HMAC of the address (never the address), pad, outcome,
 *                     time. Rows older than INVITE_LIMITS.keepDays are deleted on each write.
 * dp_pad_invite_ref   arrivals per pad, channel and day from ?ref=inv-<channel> links. Counts only.
 *
 * Tables are created on first write, like the other pad tables (pad-store.server.ts); reads never run DDL.
 *
 * PAD_INVITE_EMAILS=off switches "Send from the site" off (everything else in the panel keeps working). It is also
 * off when Resend, the DP database or a server secret (PAD_INVITE_SECRET, else AUTH_SESSION_SECRET) is missing.
 */
import { BOOK_CLUB, BOOK_CLUB_PATH, bookClubPhase, currentBookClubMeeting } from '@/data/book-club';
import 'server-only';
import type pg from 'pg';
import { readSession } from '@/lib/auth-session';
import { effectiveStatus } from '@/lib/ballots/ballot-core';
import { getBallotOverride } from '@/lib/ballots/ballot-store.server';
import { SESSION_BALLOTS } from '@/data/sessions/2026-11-16-ballot';
import { isEmailOptedOut } from '@/lib/dp-broadcast-preferences-store';
import { getDpPool } from '@/lib/dp-db';
import { DP_ROUNDUP_EVENTS } from '@/lib/dp-roundups';
import { allowHit } from '@/lib/listening/rate-limit.server';
import { publicBase, resendConfigured, sendPadEmail } from '@/lib/pads/pad-email.server';
import {
  INVITE_LIMITS,
  bookClubInvite,
  meetingInvite,
  proposalInvite,
  sessionInvite,
  type InviteChannel,
  type InviteContent,
  type InviteDeps,
  type PadInviteKind,
} from '@/lib/pads/pad-invite-core';
import { encodeOptOutToken, hashInviteEmail } from '@/lib/pads/pad-invite-token';
import { getMeetingPad } from '@/data/meeting-pads';
import { meetingPadServable } from '@/lib/meeting-pads/flag';
import { meetingPadHref } from '@/lib/meeting-pads/types';
import { GovHubUnavailableError, loadProposalPad, type LoadedPad } from '@/lib/pads/proposal-pad.server';
import { fallbackTitle, padHref } from '@/lib/pads/proposal-pad-core';
import { pacificAndUtc } from '@/lib/sessions/session-phases';

export const PAD_INVITE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS dp_pad_invite_send (
  id BIGSERIAL PRIMARY KEY,
  sender_id TEXT NOT NULL,
  recipient_hash TEXT NOT NULL,
  pad_kind TEXT NOT NULL,
  pad_key TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('sent', 'skipped', 'failed')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dp_pad_invite_send_sender ON dp_pad_invite_send (sender_id, sent_at);
CREATE INDEX IF NOT EXISTS dp_pad_invite_send_recipient ON dp_pad_invite_send (recipient_hash, sent_at);

CREATE TABLE IF NOT EXISTS dp_pad_invite_ref (
  pad_kind TEXT NOT NULL,
  pad_key TEXT NOT NULL,
  channel TEXT NOT NULL,
  day DATE NOT NULL,
  visits INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (pad_kind, pad_key, channel, day)
);
`;

let schemaReady: Promise<void> | null = null;

async function ensureSchema(pool: pg.Pool): Promise<void> {
  if (!schemaReady) {
    schemaReady = pool.query(PAD_INVITE_SCHEMA_SQL).then(() => undefined);
    schemaReady.catch(() => {
      schemaReady = null;
    });
  }
  await schemaReady;
}

async function tableExists(pool: pg.Pool, table: string): Promise<boolean> {
  const r = await pool.query('SELECT to_regclass($1) IS NOT NULL AS ok', [`public.${table}`]);
  return Boolean(r.rows[0]?.ok);
}

function inviteSecret(): string {
  return process.env.PAD_INVITE_SECRET?.trim() || process.env.AUTH_SESSION_SECRET?.trim() || process.env.HERMES_SESSION_SECRET?.trim() || '';
}

export function siteSendEnabled(): boolean {
  if (String(process.env.PAD_INVITE_EMAILS || '').trim().toLowerCase() === 'off') return false;
  return resendConfigured() && Boolean(inviteSecret()) && Boolean(getDpPool());
}

/* ---------- content per pad kind ---------- */

export function proposalInviteFromLoaded(loaded: LoadedPad): InviteContent {
  const { pad, summary } = loaded;
  return proposalInvite({
    id: pad.id,
    path: padHref(pad.id),
    title: summary?.title || fallbackTitle(pad),
    summary: summary?.summary || null,
    where: pad.dpId || pad.docLabel,
    status: pad.status,
  });
}

/** The book club pad's invite (one pad for every meeting), or null for any other path. */
export function bookClubInviteFor(path: string, now = new Date()): InviteContent | null {
  if (path !== BOOK_CLUB_PATH) return null;
  const m = currentBookClubMeeting(BOOK_CLUB.meetings, now);
  if (!m) return null;
  const dateLabel = new Date(m.startsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'America/Los_Angeles' });
  return bookClubInvite({ path, title: BOOK_CLUB.title, chapter: m.chapter, dateLabel, past: bookClubPhase(m, now) === 'after' });
}

/** A session page's invite: its meeting, date and phase, and its ballot when it has one. Null for unknown paths. */
export async function sessionInviteFor(path: string, now = new Date()): Promise<InviteContent | null> {
  const event = DP_ROUNDUP_EVENTS.find((e) => e.pageHref === path || e.href === path);
  if (!event || event.kind === 'roundup') return null;
  const slug = path.startsWith('/events/') ? path.slice('/events/'.length) : null;
  const def = slug ? SESSION_BALLOTS[slug] : undefined;
  let ballot: { status: 'not_open' | 'open' | 'closed' | 'published'; closesLabel: string } | null = null;
  if (def) {
    const override = await getBallotOverride(def.slug).catch(() => null);
    ballot = { status: effectiveStatus(def, override, now), closesLabel: pacificAndUtc(def.closesAt) };
  }
  return sessionInvite({ event, path, now, ballot });
}

/**
 * A meeting pad's invite, or null for an unknown path or a pad not served here: public pads always have one, other
 * pads only while the preview is on (meetingPadServable, src/lib/meeting-pads/flag.ts).
 */
export function meetingInviteFor(path: string): InviteContent | null {
  const prefix = meetingPadHref('');
  if (!path.startsWith(prefix)) return null;
  const pad = getMeetingPad(path.slice(prefix.length));
  if (!pad || !meetingPadServable(pad)) return null;
  return meetingInvite({ path: meetingPadHref(pad.slug), dateLabel: pad.dateLabel, title: pad.title, summary: pad.inviteSummary });
}

async function resolveContent(kind: PadInviteKind, key: string): Promise<InviteContent | null> {
  if (kind === 'proposal') {
    try {
      const loaded = await loadProposalPad(key);
      return loaded ? proposalInviteFromLoaded(loaded) : null;
    } catch (err) {
      if (err instanceof GovHubUnavailableError) return null;
      throw err;
    }
  }
  if (kind === 'session') return sessionInviteFor(key);
  if (kind === 'meeting') return meetingInviteFor(key);
  if (kind === 'bookclub') return bookClubInviteFor(key);
  return null;
}

/* ---------- store ---------- */

async function countWhere(where: string, params: unknown[]): Promise<number> {
  const pool = getDpPool();
  if (!pool || !(await tableExists(pool, 'dp_pad_invite_send'))) return 0;
  const r = await pool.query(`SELECT count(*)::int AS n FROM dp_pad_invite_send WHERE ${where}`, params);
  return Number(r.rows[0]?.n || 0);
}

const since = (ms: number) => new Date(Date.now() - ms).toISOString();

async function record(row: { senderId: string; hash: string; kind: PadInviteKind; key: string; outcome: string }): Promise<void> {
  const pool = getDpPool();
  if (!pool) throw new Error('DP database is not configured');
  await ensureSchema(pool);
  await pool.query(
    'INSERT INTO dp_pad_invite_send (sender_id, recipient_hash, pad_kind, pad_key, outcome) VALUES ($1, $2, $3, $4, $5)',
    [row.senderId, row.hash, row.kind, row.key, row.outcome],
  );
  await pool.query(`DELETE FROM dp_pad_invite_send WHERE sent_at < now() - ($1 || ' days')::interval`, [String(INVITE_LIMITS.keepDays)]);
}

/** One arrival from an invite link: a count per pad, channel and day, nothing about the visitor. */
export async function countArrival(kind: PadInviteKind, key: string, channel: InviteChannel): Promise<void> {
  const pool = getDpPool();
  if (!pool) return;
  await ensureSchema(pool);
  await pool.query(
    `INSERT INTO dp_pad_invite_ref (pad_kind, pad_key, channel, day, visits) VALUES ($1, $2, $3, (now() AT TIME ZONE 'UTC')::date, 1)
     ON CONFLICT (pad_kind, pad_key, channel, day) DO UPDATE SET visits = dp_pad_invite_ref.visits + 1`,
    [kind, key, channel],
  );
}

export const padInviteDeps = (): InviteDeps => ({
  readSession: async () => {
    const s = await readSession();
    return s ? { userId: s.userId, displayName: s.displayName, username: s.username, email: s.email ?? null } : null;
  },
  resolveContent,
  hashEmail: (email) => hashInviteEmail(email, inviteSecret()),
  isOptedOut: (email) => isEmailOptedOut(email),
  senderCount: (userId, ms) => countWhere('sender_id = $1 AND sent_at > $2', [userId, since(ms)]),
  recipientCount: (hash, ms, pad) =>
    pad
      ? countWhere("recipient_hash = $1 AND sent_at > $2 AND pad_kind = $3 AND pad_key = $4 AND outcome = 'sent'", [hash, since(ms), pad.kind, pad.key])
      : countWhere("recipient_hash = $1 AND sent_at > $2 AND outcome = 'sent'", [hash, since(ms)]),
  siteCount: (ms) => countWhere("sent_at > $1 AND outcome = 'sent'", [since(ms)]),
  record,
  optOutUrl: async (email) => {
    const secret = inviteSecret();
    return secret ? `${publicBase()}/api/pads/invite/opt-out?t=${encodeURIComponent(encodeOptOutToken(email, secret))}` : null;
  },
  send: (mail) => sendPadEmail({ ...mail, kind: 'pad_invite' }),
  allowHit: (key, max, windowMs) => allowHit(key, max, windowMs),
  base: publicBase(),
  enabled: siteSendEnabled(),
});

export { inviteSecret as padInviteSecret };
