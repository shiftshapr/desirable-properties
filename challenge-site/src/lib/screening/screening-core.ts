/**
 * Council screening of a session's draft ballot, question by question (owner's rule, 24 Nov 2026).
 *
 * Rule: no objection, per question. Each draft question goes to the ballot unless a member of the interim council
 * objects to that question on the session page, with a written reason (the 16 Nov ballot passed "published screening
 * criteria, and written reasons for anything held back", 21 to 2). Objections are public: shown next to the question
 * with the member's name, reason and time.
 *
 * When: members may object from the moment the draft is visible (review open), so they can raise issues during review
 * too. The screening window itself runs from review close for SCREENING_HOURS; at its close objections lock.
 * A member may withdraw their own objection before the close; the record that it was made and withdrawn is kept.
 *
 * Outcome per question at the close: no standing objection means "Goes to the ballot"; one or more standing
 * objections means "Held back", with the reasons listed. If nobody acts, everything goes forward as drafted.
 *
 * Who: only the signed-in accounts mapped in the server-only council config (council-members.server.ts), by Gov Hub
 * account id. The name shown is the config's name, never the account's display name.
 *
 * This file is pure (no runtime imports), so scripts/council-screening.test.mjs can drive the handlers with fake
 * dependencies. The route under src/app/api/sessions/[slug]/screening/ wires in the real session reader and store.
 */

export type ScreeningQuestion = { key: string; n: number; question: string };

export type ScreeningDefinition = {
  /** The session slug (the page's occurrence), e.g. "listening-2026-11-23". */
  slug: string;
  /** Draft visible, review open: objections accepted from here. */
  opensAt: string;
  /** Review closes: the screening window starts. */
  windowStartsAt: string;
  /** Screening window closes: objections lock and the outcome is final. */
  closesAt: string;
  questions: readonly ScreeningQuestion[];
};

export type CouncilMember = { userId: string; name: string };

export type ObjectionRow = {
  id: string;
  question_key: string;
  member_user_id: string;
  member_name: string;
  reason: string;
  created_at: string;
  withdrawn_at: string | null;
};

/** not_open: draft not visible yet. review: objections accepted while the review runs. screening: the window. */
export type ScreeningStatus = 'not_open' | 'review' | 'screening' | 'closed';

export const REASON_MIN = 10;
export const REASON_MAX = 2000;

const at = (iso: string) => new Date(iso).getTime();

export function screeningStatus(def: Pick<ScreeningDefinition, 'opensAt' | 'windowStartsAt' | 'closesAt'>, now: Date): ScreeningStatus {
  const t = now.getTime();
  if (t < at(def.opensAt)) return 'not_open';
  if (t >= at(def.closesAt)) return 'closed';
  if (t >= at(def.windowStartsAt)) return 'screening';
  return 'review';
}

export const acceptsObjections = (s: ScreeningStatus) => s === 'review' || s === 'screening';

/** Window: from review close for `hours`. Draft questions are keyed "q<n>" (n never renumbered once visible). */
export function screeningDefinition(input: {
  slug: string;
  draftVisibleAt: string;
  reviewClosesAt: string;
  hours: number;
  questions: ReadonlyArray<{ n: number; question: string }>;
}): ScreeningDefinition {
  const closesAt = new Date(at(input.reviewClosesAt) + input.hours * 3600_000).toISOString();
  return {
    slug: input.slug,
    opensAt: new Date(input.draftVisibleAt).toISOString(),
    windowStartsAt: new Date(input.reviewClosesAt).toISOString(),
    closesAt,
    questions: input.questions.map((q) => ({ key: `q${q.n}`, n: q.n, question: q.question })),
  };
}

export function memberFor(members: readonly CouncilMember[], userId: string | null | undefined): CouncilMember | null {
  if (!userId) return null;
  return members.find((m) => m.userId === userId) ?? null;
}

export function parseReason(raw: unknown): { ok: true; reason: string } | { ok: false; error: string } {
  const reason = typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : '';
  if (!reason) return { ok: false, error: 'A reason is required. Say why this question should be held back.' };
  if (reason.length < REASON_MIN) return { ok: false, error: `Give a reason of at least ${REASON_MIN} characters.` };
  if (reason.length > REASON_MAX) return { ok: false, error: `Keep the reason under ${REASON_MAX} characters.` };
  return { ok: true, reason };
}

export type PublicObjection = {
  id: string;
  name: string;
  reason: string;
  createdAt: string;
  withdrawnAt: string | null;
  /** True only for the signed-in member's own objections. */
  mine: boolean;
};

export type QuestionScreening = {
  key: string;
  n: number;
  standing: PublicObjection[];
  withdrawn: PublicObjection[];
  /** pending until the close; then goes_to_ballot (no standing objection) or held_back. */
  outcome: 'pending' | 'goes_to_ballot' | 'held_back';
};

/** Per-question screening state. A row withdrawn after the close (should not happen) still counts as standing. */
export function screenQuestions(
  def: ScreeningDefinition,
  rows: readonly ObjectionRow[],
  now: Date,
  viewerUserId: string | null = null,
): QuestionScreening[] {
  const closed = now.getTime() >= at(def.closesAt);
  return def.questions.map((q) => {
    const items = rows
      .filter((r) => r.question_key === q.key)
      .sort((a, b) => at(a.created_at) - at(b.created_at))
      .map((r) => ({
        counts: !r.withdrawn_at || at(r.withdrawn_at) >= at(def.closesAt),
        o: {
          id: r.id,
          name: r.member_name,
          reason: r.reason,
          createdAt: r.created_at,
          withdrawnAt: r.withdrawn_at,
          mine: Boolean(viewerUserId) && r.member_user_id === viewerUserId,
        } satisfies PublicObjection,
      }));
    const standing = items.filter((x) => x.counts).map((x) => x.o);
    const withdrawn = items.filter((x) => !x.counts).map((x) => x.o);
    const outcome = !closed ? 'pending' : standing.length ? 'held_back' : 'goes_to_ballot';
    return { key: q.key, n: q.n, standing, withdrawn, outcome };
  });
}

export function outcomeLabel(q: Pick<QuestionScreening, 'outcome' | 'standing'>): string {
  if (q.outcome === 'goes_to_ballot') return 'Goes to the ballot';
  if (q.outcome === 'held_back') return `Held back (${q.standing.length} ${q.standing.length === 1 ? 'objection' : 'objections'})`;
  if (!q.standing.length) return 'No objections yet';
  return `${q.standing.length} ${q.standing.length === 1 ? 'objection' : 'objections'}`;
}

/* ---------------- API handlers ---------------- */

export type ScreeningViewer = { userId: string };

export type WriteResult =
  | { ok: true }
  | { ok: false; code: 'closed' | 'already' | 'not_found' | 'not_yours' | 'already_withdrawn' };

export type ScreeningDeps = {
  readSession: () => Promise<ScreeningViewer | null>;
  getDefinition: (slug: string) => ScreeningDefinition | null;
  members: () => readonly CouncilMember[];
  rows: (slug: string) => Promise<ObjectionRow[]>;
  /** Re-checks the window on the database clock inside the write. */
  addObjection: (def: ScreeningDefinition, member: CouncilMember, questionKey: string, reason: string) => Promise<WriteResult>;
  withdrawObjection: (def: ScreeningDefinition, member: CouncilMember, id: string) => Promise<WriteResult>;
  allowHit: (key: string, max: number, windowMs: number) => boolean;
  now?: () => Date;
};

export const SCREENING_LIMITS = { writesPerMinute: 10, readsPerMinute: 60 };

const NO_STORE = { 'Cache-Control': 'no-store, private' };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...NO_STORE } });
}

export type ScreeningView = {
  ok: true;
  screening: { status: ScreeningStatus; opensAt: string; windowStartsAt: string; closesAt: string };
  viewer: { signedIn: boolean; member: boolean; name: string | null };
  questions: QuestionScreening[];
};

/** The public state of the screening plus the viewer's role. Shared by the page (server) and GET. */
export async function screeningView(def: ScreeningDefinition, deps: ScreeningDeps, viewer: ScreeningViewer | null): Promise<ScreeningView> {
  const now = deps.now ? deps.now() : new Date();
  const member = memberFor(deps.members(), viewer?.userId);
  const status = screeningStatus(def, now);
  const rows = status === 'not_open' ? [] : await deps.rows(def.slug);
  return {
    ok: true,
    screening: { status, opensAt: def.opensAt, windowStartsAt: def.windowStartsAt, closesAt: def.closesAt },
    viewer: { signedIn: Boolean(viewer?.userId), member: Boolean(member), name: member?.name ?? null },
    questions: screenQuestions(def, rows, now, member ? member.userId : null),
  };
}

export async function handleScreeningGet(slug: string, deps: ScreeningDeps): Promise<Response> {
  const def = deps.getDefinition(slug);
  if (!def) return json({ ok: false, error: 'No screening for this session' }, 404);
  const viewer = await deps.readSession().catch(() => null);
  if (viewer && !deps.allowHit(`screening-read:${viewer.userId}`, SCREENING_LIMITS.readsPerMinute, 60_000)) {
    return json({ ok: false, error: 'Too many requests. Wait a minute and try again.' }, 429);
  }
  return json(await screeningView(def, deps, viewer));
}

/**
 * POST { action: "object", question: "q3", reason } or { action: "withdraw", id }.
 * Council members only, while the draft is visible and before the window closes.
 */
export async function handleScreeningPost(request: Request, slug: string, deps: ScreeningDeps): Promise<Response> {
  const def = deps.getDefinition(slug);
  if (!def) return json({ ok: false, error: 'No screening for this session' }, 404);
  // JSON only: a cross-site form cannot send application/json without a CORS preflight.
  const ctype = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (ctype !== 'application/json') return json({ ok: false, error: 'Send JSON.' }, 415);
  const viewer = await deps.readSession().catch(() => null);
  if (!viewer || !viewer.userId) return json({ ok: false, code: 'sign_in', error: 'Sign in first.' }, 401);
  const member = memberFor(deps.members(), viewer.userId);
  if (!member) {
    return json({ ok: false, code: 'not_member', error: 'Only interim council members can object to a draft question.' }, 403);
  }
  if (!deps.allowHit(`screening-write:${viewer.userId}`, SCREENING_LIMITS.writesPerMinute, 60_000)) {
    return json({ ok: false, error: 'Too many changes. Wait a minute and try again.' }, 429);
  }
  const now = deps.now ? deps.now() : new Date();
  const status = screeningStatus(def, now);
  if (!acceptsObjections(status)) {
    return json(
      { ok: false, code: 'closed', error: status === 'not_open' ? 'The draft is not open yet.' : 'Screening has closed.' },
      409,
    );
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const action = body && typeof body === 'object' ? body.action : undefined;
  let result: WriteResult;
  if (action === 'object') {
    const q = def.questions.find((x) => x.key === body?.question);
    if (!q) return json({ ok: false, error: 'Unknown question.' }, 400);
    const reason = parseReason(body?.reason);
    if (!reason.ok) return json({ ok: false, code: 'reason', error: reason.error }, 400);
    result = await deps.addObjection(def, member, q.key, reason.reason);
  } else if (action === 'withdraw') {
    const id = typeof body?.id === 'string' ? body.id.slice(0, 64) : '';
    if (!id) return json({ ok: false, error: 'Which objection?' }, 400);
    result = await deps.withdrawObjection(def, member, id);
  } else {
    return json({ ok: false, error: 'Send action "object" or "withdraw".' }, 400);
  }
  if (!result.ok) {
    const map: Record<string, [number, string]> = {
      closed: [409, 'Screening has closed.'],
      already: [409, 'You already have an objection standing on this question. Withdraw it first to change it.'],
      not_found: [404, 'Objection not found.'],
      not_yours: [403, 'You can only withdraw your own objection.'],
      already_withdrawn: [409, 'That objection was already withdrawn.'],
    };
    const [st, error] = map[result.code];
    return json({ ok: false, code: result.code, error }, st);
  }
  return json(await screeningView(def, deps, viewer));
}
