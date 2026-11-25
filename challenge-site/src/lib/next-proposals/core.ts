/**
 * Proposals for the next session (owner, 25 Nov 2026): anyone signed in can put a proposal on the next community
 * session's agenda from any session page. It shows at once on that session's page under "Proposals for this
 * session", labelled "Participant proposal" with the name the person gives (a real name, never an email or handle),
 * kept apart from the meeting record. Others can support it (one click, one per person; the proposer cannot support
 * their own). If the community adopts "an option needs a second" (23 Nov draft ballot, question 2), a support is
 * that second. The proposer can withdraw it. An interim council member can hide spam or an off-topic proposal, with a
 * written reason that stays public. Nothing is deleted: withdrawn and hidden proposals stay on record.
 *
 * Proposals are accepted until the target session starts. The after-meeting job records each one in the ballot
 * option provenance (proposer, supporters) when it becomes a draft ballot option.
 *
 * Pure (no runtime imports), so scripts/next-session-proposals.test.mjs drives the handlers with fake deps.
 */

export type TargetSession = { date: string; title: string; startsAt: string; href: string };

export type ProposalRow = {
  id: string;
  session_date: string;
  user_id: string;
  name: string;
  title: string;
  body: string;
  created_at: string;
  withdrawn_at: string | null;
  hidden_at: string | null;
  hidden_by_name: string | null;
  hidden_reason: string | null;
};

export type SupportRow = { proposal_id: string; user_id: string; name: string; created_at: string };

export type CouncilMember = { userId: string; name: string };

export const LIMITS = {
  titleMin: 8,
  titleMax: 140,
  bodyMin: 20,
  bodyMax: 3000,
  nameMax: 80,
  reasonMin: 10,
  reasonMax: 1000,
  standingPerPersonPerSession: 3,
  writesPerMinute: 10,
  readsPerMinute: 60,
};

const clean = (v: unknown, max: number) =>
  typeof v === 'string' ? v.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max + 1) : '';

/** A real name: letters, at least two characters, no email, handle, link or digits-only. */
export function parseName(raw: unknown): { ok: true; name: string } | { ok: false; error: string } {
  const name = clean(raw, LIMITS.nameMax).replace(/\s+/g, ' ');
  const bad = 'Give your real name as you want it shown (not an email address or a handle).';
  if (!name || name.length < 2 || name.length > LIMITS.nameMax) return { ok: false, error: bad };
  if (/[@<>]|https?:|www\.|^\W|\d{3,}/i.test(name) || !/\p{L}/u.test(name)) return { ok: false, error: bad };
  return { ok: true, name };
}

/** A display name good enough to prefill the name field, else null. */
export function prefillName(displayName: string | null | undefined): string | null {
  const r = parseName(displayName ?? '');
  return r.ok ? r.name : null;
}

export function parseProposal(body: Record<string, unknown>):
  | { ok: true; title: string; text: string; name: string }
  | { ok: false; error: string } {
  const title = clean(body.title, LIMITS.titleMax).replace(/\s+/g, ' ');
  const text = clean(body.body, LIMITS.bodyMax);
  if (title.length < LIMITS.titleMin) return { ok: false, error: `Give a title of at least ${LIMITS.titleMin} characters.` };
  if (title.length > LIMITS.titleMax) return { ok: false, error: `Keep the title under ${LIMITS.titleMax} characters.` };
  if (text.length < LIMITS.bodyMin) return { ok: false, error: `Say what you propose and why, in at least ${LIMITS.bodyMin} characters.` };
  if (text.length > LIMITS.bodyMax) return { ok: false, error: `Keep it under ${LIMITS.bodyMax} characters.` };
  const name = parseName(body.name);
  if (!name.ok) return name;
  return { ok: true, title, text, name: name.name };
}

export function parseReason(raw: unknown): { ok: true; reason: string } | { ok: false; error: string } {
  const reason = clean(raw, LIMITS.reasonMax).replace(/\s+/g, ' ');
  if (reason.length < LIMITS.reasonMin) return { ok: false, error: `Give a reason of at least ${LIMITS.reasonMin} characters.` };
  if (reason.length > LIMITS.reasonMax) return { ok: false, error: `Keep the reason under ${LIMITS.reasonMax} characters.` };
  return { ok: true, reason };
}

/** The next session that has not started yet (the earliest), or null. */
export function nextSession(sessions: readonly TargetSession[], now: Date): TargetSession | null {
  const t = now.getTime();
  return [...sessions].filter((s) => Date.parse(s.startsAt) > t).sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0] ?? null;
}

export const acceptsProposals = (s: TargetSession, now: Date) => now.getTime() < Date.parse(s.startsAt);

export type PublicProposal = {
  id: string;
  name: string;
  title: string;
  body: string;
  createdAt: string;
  supporters: { name: string; at: string }[];
  status: 'standing' | 'withdrawn' | 'hidden';
  hidden: { by: string; reason: string; at: string } | null;
  withdrawnAt: string | null;
  mine: boolean;
  supportedByMe: boolean;
};

export type ProposalsView = {
  ok: true;
  session: TargetSession;
  open: boolean;
  viewer: { signedIn: boolean; member: boolean; suggestedName: string | null };
  proposals: PublicProposal[];
};

export function toPublic(rows: readonly ProposalRow[], supports: readonly SupportRow[], viewerId: string | null): PublicProposal[] {
  return [...rows]
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
    .map((r) => {
      const sup = supports.filter((s) => s.proposal_id === r.id).sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
      const hidden = r.hidden_at;
      return {
        id: r.id,
        name: r.name,
        title: hidden ? '' : r.title,
        body: hidden ? '' : r.body,
        createdAt: r.created_at,
        supporters: sup.map((s) => ({ name: s.name, at: s.created_at })),
        status: hidden ? 'hidden' : r.withdrawn_at ? 'withdrawn' : 'standing',
        hidden: hidden ? { by: r.hidden_by_name || 'Interim council', reason: r.hidden_reason || '', at: hidden } : null,
        withdrawnAt: r.withdrawn_at,
        mine: Boolean(viewerId) && r.user_id === viewerId,
        supportedByMe: Boolean(viewerId) && sup.some((s) => s.user_id === viewerId),
      } satisfies PublicProposal;
    });
}

/* ---------------- handlers ---------------- */

export type Viewer = { userId: string; displayName: string | null };

export type WriteResult = { ok: true } | { ok: false; code: 'closed' | 'not_found' | 'not_yours' | 'own' | 'already' | 'too_many' | 'gone' };

export type ProposalDeps = {
  readSession: () => Promise<Viewer | null>;
  sessions: () => readonly TargetSession[];
  members: () => readonly CouncilMember[];
  rows: (date: string) => Promise<{ proposals: ProposalRow[]; supports: SupportRow[] }>;
  /** The writes re-check the target's start on the database clock. */
  add: (s: TargetSession, v: Viewer, p: { name: string; title: string; text: string }) => Promise<WriteResult>;
  support: (s: TargetSession, v: Viewer, id: string, name: string, on: boolean) => Promise<WriteResult>;
  withdraw: (s: TargetSession, v: Viewer, id: string) => Promise<WriteResult>;
  hide: (s: TargetSession, m: CouncilMember, id: string, reason: string) => Promise<WriteResult>;
  allowHit: (key: string, max: number, windowMs: number) => boolean;
  now?: () => Date;
};

const NO_STORE = { 'Cache-Control': 'no-store, private' };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...NO_STORE } });

export function findSession(deps: Pick<ProposalDeps, 'sessions'>, date: string): TargetSession | null {
  return deps.sessions().find((s) => s.date === date) ?? null;
}

export async function proposalsView(session: TargetSession, deps: ProposalDeps, viewer: Viewer | null): Promise<ProposalsView> {
  const now = deps.now ? deps.now() : new Date();
  const { proposals, supports } = await deps.rows(session.date);
  const member = viewer ? deps.members().some((m) => m.userId === viewer.userId) : false;
  return {
    ok: true,
    session,
    open: acceptsProposals(session, now),
    viewer: { signedIn: Boolean(viewer?.userId), member, suggestedName: prefillName(viewer?.displayName) },
    proposals: toPublic(proposals, supports, viewer?.userId ?? null),
  };
}

export async function handleProposalsGet(date: string, deps: ProposalDeps): Promise<Response> {
  const session = findSession(deps, date);
  if (!session) return json({ ok: false, error: 'No session on that date.' }, 404);
  const viewer = await deps.readSession().catch(() => null);
  if (viewer && !deps.allowHit(`next-proposals-read:${viewer.userId}`, LIMITS.readsPerMinute, 60_000)) {
    return json({ ok: false, error: 'Too many requests. Wait a minute and try again.' }, 429);
  }
  return json(await proposalsView(session, deps, viewer));
}

const ERRORS: Record<Exclude<WriteResult, { ok: true }>['code'], [number, string]> = {
  closed: [409, 'This session has started, so its agenda is closed. Propose for the next one.'],
  not_found: [404, 'Proposal not found.'],
  not_yours: [403, 'You can only withdraw your own proposal.'],
  own: [409, 'You cannot support your own proposal.'],
  already: [409, 'That was already done.'],
  too_many: [409, `You already have ${LIMITS.standingPerPersonPerSession} proposals for this session. Withdraw one to add another.`],
  gone: [409, 'That proposal was withdrawn or hidden.'],
};

/**
 * POST { action: "propose", name, title, body } | { action: "support", id, name } | { action: "unsupport", id }
 *    | { action: "withdraw", id } | { action: "hide", id, reason } (council only).
 */
export async function handleProposalsPost(request: Request, date: string, deps: ProposalDeps): Promise<Response> {
  const session = findSession(deps, date);
  if (!session) return json({ ok: false, error: 'No session on that date.' }, 404);
  const ctype = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (ctype !== 'application/json') return json({ ok: false, error: 'Send JSON.' }, 415);
  const viewer = await deps.readSession().catch(() => null);
  if (!viewer || !viewer.userId) return json({ ok: false, code: 'sign_in', error: 'Sign in first.' }, 401);
  if (!deps.allowHit(`next-proposals-write:${viewer.userId}`, LIMITS.writesPerMinute, 60_000)) {
    return json({ ok: false, error: 'Too many changes. Wait a minute and try again.' }, 429);
  }
  const now = deps.now ? deps.now() : new Date();
  if (!acceptsProposals(session, now)) return json({ ok: false, code: 'closed', error: ERRORS.closed[1] }, 409);
  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const id = typeof body.id === 'string' ? body.id.slice(0, 64) : '';
  let result: WriteResult;
  switch (body.action) {
    case 'propose': {
      const p = parseProposal(body);
      if (!p.ok) return json({ ok: false, code: 'invalid', error: p.error }, 400);
      result = await deps.add(session, viewer, { name: p.name, title: p.title, text: p.text });
      break;
    }
    case 'support': {
      const n = parseName(body.name);
      if (!n.ok) return json({ ok: false, code: 'invalid', error: n.error }, 400);
      if (!id) return json({ ok: false, error: 'Which proposal?' }, 400);
      result = await deps.support(session, viewer, id, n.name, true);
      break;
    }
    case 'unsupport':
      if (!id) return json({ ok: false, error: 'Which proposal?' }, 400);
      result = await deps.support(session, viewer, id, '', false);
      break;
    case 'withdraw':
      if (!id) return json({ ok: false, error: 'Which proposal?' }, 400);
      result = await deps.withdraw(session, viewer, id);
      break;
    case 'hide': {
      const member = deps.members().find((m) => m.userId === viewer.userId);
      if (!member) return json({ ok: false, code: 'not_member', error: 'Only interim council members can hide a proposal.' }, 403);
      const r = parseReason(body.reason);
      if (!r.ok) return json({ ok: false, code: 'invalid', error: r.error }, 400);
      if (!id) return json({ ok: false, error: 'Which proposal?' }, 400);
      result = await deps.hide(session, member, id, r.reason);
      break;
    }
    default:
      return json({ ok: false, error: 'Unknown action.' }, 400);
  }
  if (!result.ok) {
    const [st, error] = ERRORS[result.code];
    return json({ ok: false, code: result.code, error }, st);
  }
  return json(await proposalsView(session, deps, viewer));
}
