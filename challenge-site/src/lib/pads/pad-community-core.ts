/**
 * Pad community layer: advisory Support / Concern and Follow. Pure (no runtime imports), so
 * scripts/proposal-pads.test.mjs drives the handlers with fake dependencies; the routes under
 * src/app/api/pads/proposals/[id]/ wire in the real session, store and proposal lookup.
 *
 * Privacy follows the session ballot (src/lib/ballots/ballot-core.ts): one current stance per account, changeable;
 * no endpoint returns another account's stance or id. Counts and reasons are public; a reason carries the voter's
 * name only when the voter ticked "show my name".
 */
import { ADVISORY_REASON_MAX } from '@/lib/pads/pad-settings';

export type Stance = 'support' | 'concern';
export type PadKind = 'proposal';

export type PadSession = { userId: string; displayName: string | null; username: string | null; email: string | null };

export type AdvisoryRow = {
  user_id: string;
  stance: Stance;
  reason: string | null;
  show_name: boolean;
  display_name: string | null;
  updated_at: string;
};

export type AdvisoryTally = {
  support: number;
  concern: number;
  reasons: Array<{ stance: Stance; reason: string; name: string | null; at: string }>;
};

export type MyAdvisory = { stance: Stance; reason: string | null; showName: boolean } | null;

export function cleanReason(raw: unknown): string | null {
  const flat = String(raw ?? '').replace(/\s+/g, ' ').trim();
  return flat ? flat.slice(0, ADVISORY_REASON_MAX) : null;
}

export function parseAdvisory(
  body: unknown,
): { ok: true; clear: true } | { ok: true; clear: false; stance: Stance; reason: string | null; showName: boolean } | { ok: false; error: string } {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const stance = String(b.stance ?? '').toLowerCase();
  if (stance === 'clear' || stance === '') return { ok: true, clear: true };
  if (stance !== 'support' && stance !== 'concern') return { ok: false, error: 'stance must be support, concern or clear' };
  return { ok: true, clear: false, stance, reason: cleanReason(b.reason), showName: b.showName === true };
}

export function tallyAdvisory(rows: AdvisoryRow[]): AdvisoryTally {
  const support = rows.filter((r) => r.stance === 'support').length;
  const concern = rows.length - support;
  const reasons = rows
    .filter((r) => r.reason)
    .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
    .map((r) => ({
      stance: r.stance,
      reason: r.reason as string,
      name: r.show_name ? r.display_name || 'A reader' : null,
      at: r.updated_at,
    }));
  return { support, concern, reasons };
}

export type CommunityDeps = {
  readSession: () => Promise<PadSession | null>;
  /** The full proposal id and its current status, or null when the pad does not exist. */
  resolvePad: (rawId: string, mlHint?: string | null) => Promise<{ id: string; status: string; mlNumber: string; dpId: string | null } | null>;
  advisoryRows: (kind: PadKind, padId: string) => Promise<AdvisoryRow[]>;
  saveAdvisory: (
    kind: PadKind,
    padId: string,
    session: PadSession,
    v: { stance: Stance; reason: string | null; showName: boolean } | null,
  ) => Promise<void>;
  isFollowing: (kind: PadKind, padId: string, userId: string) => Promise<boolean>;
  setFollow: (
    kind: PadKind,
    pad: { id: string; status: string; mlNumber: string; dpId: string | null },
    session: PadSession,
    on: boolean,
  ) => Promise<void>;
  allowHit: (key: string, max: number, windowMs: number) => boolean;
};

type Reply = { status: number; body: Record<string, unknown> };

function mine(rows: AdvisoryRow[], userId: string | null): MyAdvisory {
  const r = userId ? rows.find((x) => x.user_id === userId) : undefined;
  return r ? { stance: r.stance, reason: r.reason, showName: r.show_name } : null;
}

export async function handleCommunityGet(deps: CommunityDeps, rawId: string, mlHint?: string | null): Promise<Reply> {
  const pad = await deps.resolvePad(rawId, mlHint);
  if (!pad) return { status: 404, body: { error: 'No such proposal' } };
  const session = await deps.readSession();
  const rows = await deps.advisoryRows('proposal', pad.id);
  return {
    status: 200,
    body: {
      signedIn: Boolean(session),
      tally: tallyAdvisory(rows),
      mine: mine(rows, session?.userId ?? null),
      following: session ? await deps.isFollowing('proposal', pad.id, session.userId) : false,
      canFollow: Boolean(session?.email),
    },
  };
}

export async function handleAdvisoryPost(deps: CommunityDeps, rawId: string, body: unknown, mlHint?: string | null): Promise<Reply> {
  const session = await deps.readSession();
  if (!session) return { status: 401, body: { error: 'Sign in to give your view', code: 'sign_in' } };
  if (!deps.allowHit(`pad-advisory:${session.userId}`, 30, 60_000)) {
    return { status: 429, body: { error: 'Too many changes; wait a minute' } };
  }
  const pad = await deps.resolvePad(rawId, mlHint);
  if (!pad) return { status: 404, body: { error: 'No such proposal' } };
  const parsed = parseAdvisory(body);
  if (!parsed.ok) return { status: 400, body: { error: parsed.error } };
  await deps.saveAdvisory(
    'proposal',
    pad.id,
    session,
    parsed.clear ? null : { stance: parsed.stance, reason: parsed.reason, showName: parsed.showName },
  );
  const rows = await deps.advisoryRows('proposal', pad.id);
  return { status: 200, body: { ok: true, tally: tallyAdvisory(rows), mine: mine(rows, session.userId) } };
}

export async function handleFollowPost(deps: CommunityDeps, rawId: string, body: unknown, mlHint?: string | null): Promise<Reply> {
  const session = await deps.readSession();
  if (!session) return { status: 401, body: { error: 'Sign in to follow this pad', code: 'sign_in' } };
  if (!deps.allowHit(`pad-follow:${session.userId}`, 30, 60_000)) {
    return { status: 429, body: { error: 'Too many changes; wait a minute' } };
  }
  const pad = await deps.resolvePad(rawId, mlHint);
  if (!pad) return { status: 404, body: { error: 'No such proposal' } };
  const on = !(body && typeof body === 'object' && (body as Record<string, unknown>).follow === false);
  if (on && !session.email) {
    return { status: 409, body: { error: 'Your account has no email address to send updates to', code: 'no_email' } };
  }
  await deps.setFollow('proposal', pad, session, on);
  return { status: 200, body: { ok: true, following: on } };
}

/** Follows whose pad changed status since the follower last heard: what the sweep emails. */
export type FollowRow = {
  pad_id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  ml_number: string;
  dp_id: string | null;
  last_status: string;
};

export function statusChanges(
  follows: FollowRow[],
  current: Map<string, { status?: string | null }>,
): Array<{ follow: FollowRow; from: string; to: string }> {
  const out: Array<{ follow: FollowRow; from: string; to: string }> = [];
  for (const f of follows) {
    const now = current.get(f.pad_id);
    if (!now) continue;
    const to = String(now.status || '').toLowerCase();
    if (to && to !== f.last_status) out.push({ follow: f, from: f.last_status, to });
  }
  return out;
}

const WORD: Record<string, string> = {
  pending: 'open',
  incorporated: 'incorporated into the chapter',
  declined: 'declined',
  considered: 'closed',
  withdrawn: 'withdrawn by its author',
};

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** The status-change email. Always carries the unsubscribe link (token link from the broadcast preferences). */
export function followEmail(input: {
  padUrl: string;
  unsubscribeUrl: string;
  padTitle: string;
  docLabel: string;
  to: string;
  name: string | null;
}): { subject: string; html: string; text: string } {
  const now = WORD[input.to] || input.to;
  const subject = `Proposal update: ${input.padTitle} is now ${now}`;
  const lines = [
    `${input.name ? `Hi ${input.name},` : 'Hello,'}`,
    `A proposal you follow on ${input.docLabel} is now ${now}.`,
    `${input.padTitle}`,
    `See the pad: ${input.padUrl}`,
    `You get this because you followed this proposal pad. Unfollow on the pad, or unsubscribe from Desirable Properties email: ${input.unsubscribeUrl}`,
  ];
  const html = `<p>${esc(lines[0])}</p><p>${esc(lines[1])}</p><p><strong>${esc(input.padTitle)}</strong></p><p><a href="${esc(input.padUrl)}">See the proposal pad</a></p><p style="font-size:12px;color:#666;margin-top:2em;">You get this because you followed this proposal pad. Unfollow on the pad, or <a href="${esc(input.unsubscribeUrl)}">unsubscribe from Desirable Properties email</a>.</p>`;
  return { subject, html, text: lines.join('\n\n') };
}
