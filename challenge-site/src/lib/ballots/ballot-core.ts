/**
 * Session ballots: one options ballot per listening-session occurrence, on that session's own page.
 *
 * Mechanism (19 Nov 2026): Gov Hub's election engine elects people only (approval ballots over candidates) and has no
 * question-with-options ballot; the listening workspace has a "Voting open" phase but no vote code and is off in
 * production by design. So the ballot is stored in the DP site's own Postgres (dp_ballot_vote, plus an optional
 * dp_ballot row for publishing results or stopping early; see ballot-store.server.ts).
 *
 * Who votes (owner, 19 Nov 2026): anyone signed in to desirableproperties.org, one vote per question per account.
 * When: opensAt..closesAt in the ballot definition (code). A dp_ballot row can only stop voting early ("closed") or
 * publish results ("published"); it can never open a ballot outside its window.
 *
 * Rules carried here: a voter may change a vote until the close; no endpoint returns another account's choices;
 * counts appear on the page only once the ballot is published.
 *
 * This file is pure (no runtime imports), so scripts/session-ballot.test.mjs can drive the handlers with fake
 * dependencies. The route under src/app/api/ballots/[slug]/ wires in the real session reader and store.
 */

export const ABSTAIN = 'abstain';

export type BallotOption = { key: string; label: string };

export type BallotQuestion = {
  /** Stable key stored with each vote ("q1" ...). Never renumber after the ballot opens. */
  key: string;
  n: number;
  question: string;
  context: string;
  /** A dated correction of the context note, shown under it (as on the draft ballot). */
  correction?: string;
  /** Provenance label shown beside the context (owner spec §5), when one applies. */
  label?: 'Proposal added after the meeting';
  /** yes_no: passes with more Yes than No. choice: the option with the most votes wins. Abstain never decides. */
  kind: 'yes_no' | 'choice';
  options: BallotOption[];
};

export type BallotDefinition = {
  slug: string;
  title: string;
  pagePath: string;
  /** Voting window (ISO). Voting is accepted from opensAt until closesAt, unless a dp_ballot row stops it early. */
  opensAt: string;
  closesAt: string;
  voterBody: string;
  rules: readonly string[];
  questions: readonly BallotQuestion[];
  /**
   * How a Yes/No question passes. 'plurality' (the default, the 16 Nov bootstrap rule): more Yes than No.
   * 'two_tier' (the approval rule voted on 16 Nov, question 4): of the Yes and No votes, 60% or more Yes passes it,
   * 50% to under 60% keeps it open for review, under 50% does not pass. Multiple-choice questions always take the
   * option with the most votes. Abstain never decides.
   */
  approval?: 'plurality' | 'two_tier';
  /**
   * The council screening (by session slug, SESSION_SCREENINGS) that decides which questions reach this ballot.
   * Set: the ballot opens at the screening close (opensAt must equal it) with only the questions that had no
   * standing objection then (ballot-screening-core.ts); held-back questions are shown and never votable.
   */
  screenedBy?: string;
};

export type BallotStatus = 'not_open' | 'open' | 'closed' | 'published';

/**
 * The optional dp_ballot row: an early stop or published results. null = no row. With Gov Hub as the store
 * (PAD_VOTES_BACKEND=govhub) it is Gov Hub's view: status 'open' with a later closesAt when an outage extended the
 * vote, or 'unavailable' when Gov Hub did not answer.
 */
export type BallotOverride =
  | { status: 'closed' | 'published' | 'open' | 'scheduled'; publishedAt: string | null; closesAt?: string }
  | { status: 'unavailable'; publishedAt: null; closesAt?: string }
  | null;

export type VoteRow = { question_key: string; option_key: string; user_id: string };

export type OptionCount = { key: string; label: string; votes: number };

export type QuestionResult = {
  key: string;
  n: number;
  question: string;
  kind: BallotQuestion['kind'];
  /** Accounts that answered this question, abstentions included. */
  ballots: number;
  abstain: number;
  options: OptionCount[];
  outcome:
    | { result: 'passed' | 'not_passed' | 'open_for_review'; yes: number; no: number }
    | { result: 'winner'; option: string; label: string }
    | { result: 'tie'; options: string[]; labels: string[] }
    | { result: 'no_votes' };
};

export type BallotResults = {
  slug: string;
  /** Distinct accounts that voted on at least one question. */
  voters: number;
  questions: QuestionResult[];
};

/** Status at `now`: the window in the definition, narrowed by an early stop, or published. */
export function effectiveStatus(def: Pick<BallotDefinition, 'opensAt' | 'closesAt'>, override: BallotOverride, now: Date): BallotStatus {
  if (override?.status === 'published') return 'published';
  const t = now.getTime();
  if (t < new Date(def.opensAt).getTime()) return 'not_open';
  const closesAt = override?.closesAt || def.closesAt;
  if (override?.status === 'closed' || t >= new Date(closesAt).getTime()) return 'closed';
  return 'open';
}

export function checkDefinition(def: BallotDefinition): string[] {
  const errors: string[] = [];
  const keys = new Set<string>();
  def.questions.forEach((q, i) => {
    if (keys.has(q.key)) errors.push(`duplicate question key ${q.key}`);
    keys.add(q.key);
    if (q.n !== i + 1) errors.push(`${q.key}: n=${q.n}, expected ${i + 1}`);
    const opts = new Set(q.options.map((o) => o.key));
    if (opts.size !== q.options.length) errors.push(`${q.key}: duplicate option key`);
    if (!opts.has(ABSTAIN)) errors.push(`${q.key}: no Abstain option`);
    if (q.kind === 'yes_no' && !(opts.has('yes') && opts.has('no') && opts.size === 3)) {
      errors.push(`${q.key}: yes_no must have exactly yes, no, abstain`);
    }
  });
  const o = new Date(def.opensAt).getTime();
  const c = new Date(def.closesAt).getTime();
  if (Number.isNaN(o) || Number.isNaN(c) || o >= c) errors.push('opensAt/closesAt must be dates, opensAt first');
  return errors;
}

/** Votes from a request body: { votes: { q1: "yes", ... } }. Unknown questions or options are refused, not dropped. */
export function parseVotes(
  def: BallotDefinition,
  body: unknown,
): { ok: true; votes: Record<string, string> } | { ok: false; error: string } {
  const raw = body && typeof body === 'object' ? (body as Record<string, unknown>).votes : undefined;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'Send votes as { votes: { question: option } }.' };
  const votes: Record<string, string> = {};
  for (const [qKey, value] of Object.entries(raw as Record<string, unknown>)) {
    const q = def.questions.find((x) => x.key === qKey);
    if (!q) return { ok: false, error: `Unknown question: ${qKey.slice(0, 40)}` };
    const opt = typeof value === 'string' ? q.options.find((o) => o.key === value) : undefined;
    if (!opt) return { ok: false, error: `Unknown option for question ${q.n}.` };
    votes[q.key] = opt.key;
  }
  if (Object.keys(votes).length === 0) return { ok: false, error: 'Choose at least one option.' };
  return { ok: true, votes };
}

/** Two-tier rule (16 Nov ballot, question 4): Yes share of the Yes and No votes; 60% passes, 50% keeps it open. */
export const TWO_TIER = { passPercent: 60, openPercent: 50 } as const;

export function twoTierResult(yes: number, no: number): 'passed' | 'open_for_review' | 'not_passed' {
  const deciding = yes + no;
  if (deciding === 0) return 'not_passed';
  // Integer arithmetic: 100 * yes >= 60 * (yes + no), so 3 of 5 is exactly 60% and passes.
  if (100 * yes >= TWO_TIER.passPercent * deciding) return 'passed';
  if (100 * yes >= TWO_TIER.openPercent * deciding) return 'open_for_review';
  return 'not_passed';
}

/**
 * The ballot's approval rule applied to counted results. Counts are never changed; only the outcome of a Yes/No
 * question is re-read under 'two_tier'. A store that counts with the plurality rule (Gov Hub) is re-read here.
 */
export function applyApproval(def: Pick<BallotDefinition, 'approval'>, results: BallotResults): BallotResults {
  if (def.approval !== 'two_tier') return results;
  return {
    ...results,
    questions: results.questions.map((q) => {
      if (q.kind !== 'yes_no' || q.outcome.result === 'no_votes') return q;
      const yes = q.options.find((o) => o.key === 'yes')?.votes ?? 0;
      const no = q.options.find((o) => o.key === 'no')?.votes ?? 0;
      return { ...q, outcome: { result: twoTierResult(yes, no), yes, no } };
    }),
  };
}

/** Count of the votes: plurality, then the ballot's approval rule. Abstain is counted but does not decide. */
export function tallyBallot(def: BallotDefinition, rows: readonly VoteRow[]): BallotResults {
  const voters = new Set<string>();
  const questions = def.questions.map<QuestionResult>((q) => {
    const counts = new Map<string, number>(q.options.map((o) => [o.key, 0]));
    const seen = new Set<string>();
    for (const r of rows) {
      if (r.question_key !== q.key || seen.has(r.user_id) || !counts.has(r.option_key)) continue;
      seen.add(r.user_id);
      voters.add(r.user_id);
      counts.set(r.option_key, (counts.get(r.option_key) || 0) + 1);
    }
    const options = q.options.map((o) => ({ key: o.key, label: o.label, votes: counts.get(o.key) || 0 }));
    const abstain = counts.get(ABSTAIN) || 0;
    const deciding = options.filter((o) => o.key !== ABSTAIN);
    let outcome: QuestionResult['outcome'];
    if (deciding.every((o) => o.votes === 0)) {
      outcome = { result: 'no_votes' };
    } else if (q.kind === 'yes_no') {
      const yes = counts.get('yes') || 0;
      const no = counts.get('no') || 0;
      outcome = { result: yes > no ? 'passed' : 'not_passed', yes, no };
    } else {
      const top = Math.max(...deciding.map((o) => o.votes));
      const leaders = deciding.filter((o) => o.votes === top);
      outcome =
        leaders.length === 1
          ? { result: 'winner', option: leaders[0].key, label: leaders[0].label }
          : { result: 'tie', options: leaders.map((o) => o.key), labels: leaders.map((o) => o.label) };
    }
    return { key: q.key, n: q.n, question: q.question, kind: q.kind, ballots: seen.size, abstain, options, outcome };
  });
  return applyApproval(def, { slug: def.slug, voters: voters.size, questions });
}

export function outcomeText(r: QuestionResult): string {
  const o = r.outcome;
  switch (o.result) {
    case 'passed':
      return `Passed (${o.yes} Yes, ${o.no} No)`;
    case 'not_passed':
      return `Not passed (${o.yes} Yes, ${o.no} No)`;
    case 'open_for_review':
      return `Kept open for review (${o.yes} Yes, ${o.no} No)`;
    case 'winner':
      return `Most votes: ${o.label}`;
    case 'tie':
      return `Tie: ${o.labels.join(' / ')}`;
    default:
      return 'No votes';
  }
}

/* ---------------- Screened ballots ---------------- */

export type HeldBackQuestion = {
  key: string;
  /** The draft ballot's number, as the screening showed it. */
  n: number;
  question: string;
  objections: { name: string; reason: string; createdAt: string }[];
};

/**
 * What can be voted on. A ballot with `screenedBy` is 'pending' until its screening closes; then 'ready' with the
 * questions that went to the ballot (renumbered 1..k for the store, keys unchanged) and the held-back ones.
 * A ballot without screening is always 'ready' with itself.
 */
export type ResolvedBallot =
  | { state: 'pending' }
  | { state: 'ready'; votable: BallotDefinition; heldBack: HeldBackQuestion[] };

/** Draft numbers back on results counted against the renumbered votable definition (matched by key). */
export function withDraftNumbers(def: BallotDefinition, results: BallotResults): BallotResults {
  return {
    ...results,
    questions: results.questions.map((r) => ({ ...r, n: def.questions.find((q) => q.key === r.key)?.n ?? r.n })),
  };
}

/* ---------------- API handlers ---------------- */

export type BallotViewer = { userId: string; username: string; displayName: string | null };

export type SaveResult = { ok: true; savedAt: string } | { ok: false; code: 'not_open' | 'unavailable' | 'not_eligible' };

export type BallotDeps = {
  readSession: () => Promise<BallotViewer | null>;
  getDefinition: (slug: string) => BallotDefinition | null;
  getOverride: (slug: string) => Promise<BallotOverride>;
  myVotes: (slug: string, userId: string) => Promise<Record<string, string>>;
  /** Re-checks the window and any early stop inside the write transaction, on the database clock. */
  saveVotes: (def: BallotDefinition, userId: string, votes: Record<string, string>) => Promise<SaveResult>;
  resultRows: (slug: string) => Promise<VoteRow[]>;
  /** Published totals counted by the store itself (Gov Hub); when set, resultRows is not used. */
  results?: (def: BallotDefinition) => Promise<BallotResults | null>;
  /**
   * The questions that can be voted on (screened ballots). Absent: the definition as it is. 'unavailable': the
   * screening outcome could not be read, so nothing is votable (fail closed).
   */
  resolve?: (def: BallotDefinition, now: Date) => Promise<ResolvedBallot | 'unavailable'>;
  allowHit: (key: string, max: number, windowMs: number) => boolean;
  now?: () => Date;
};

export const BALLOT_LIMITS = { savesPerMinute: 10, readsPerMinute: 60 };

const NO_STORE = { 'Cache-Control': 'no-store, private' };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...NO_STORE } });
}

/** GET: ballot status for anyone; a signed-in account's own votes; totals once published. */
export async function handleBallotGet(slug: string, deps: BallotDeps): Promise<Response> {
  const def = deps.getDefinition(slug);
  if (!def) return json({ ok: false, error: 'Unknown ballot' }, 404);
  const now = deps.now ? deps.now() : new Date();
  const viewer = await deps.readSession().catch(() => null);
  if (viewer && !deps.allowHit(`ballot-read:${viewer.userId}`, BALLOT_LIMITS.readsPerMinute, 60_000)) {
    return json({ ok: false, error: 'Too many requests. Wait a minute and try again.' }, 429);
  }
  const override = await deps.getOverride(slug);
  const status = effectiveStatus(def, override, now);
  const resolved = status === 'not_open' ? null : await resolveFor(def, deps, now);
  const ready = resolved && resolved !== 'unavailable' && resolved.state === 'ready' ? resolved : null;
  const viewerOut = viewer
    ? { signedIn: true, votes: await deps.myVotes(slug, viewer.userId) }
    : { signedIn: false, votes: {} };
  const counted =
    status === 'published' && ready
      ? deps.results
        ? await deps.results(ready.votable)
        : tallyBallot(ready.votable, await deps.resultRows(slug))
      : null;
  const results = counted ? withDraftNumbers(def, applyApproval(def, counted)) : null;
  return json({
    ok: true,
    ballot: {
      status,
      opensAt: def.opensAt,
      closesAt: override?.closesAt || def.closesAt,
      publishedAt: override?.publishedAt ?? null,
      ...(override?.status === 'unavailable' || resolved === 'unavailable' ? { unavailable: true } : {}),
      ...(def.screenedBy
        ? { questions: ready ? ready.votable.questions.map((q) => q.key) : [], heldBack: ready ? ready.heldBack : [] }
        : {}),
    },
    viewer: viewerOut,
    results,
  });
}

async function resolveFor(def: BallotDefinition, deps: BallotDeps, now: Date): Promise<ResolvedBallot | 'unavailable'> {
  if (!deps.resolve) return { state: 'ready', votable: def, heldBack: [] };
  return deps.resolve(def, now).catch(() => 'unavailable' as const);
}

/** POST { votes: { q1: "yes", ... } }: any signed-in account, while open. Re-posting a question replaces the vote. */
export async function handleBallotPost(request: Request, slug: string, deps: BallotDeps): Promise<Response> {
  const def = deps.getDefinition(slug);
  if (!def) return json({ ok: false, error: 'Unknown ballot' }, 404);
  // JSON only: a cross-site form cannot send application/json without a CORS preflight.
  const ctype = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (ctype !== 'application/json') return json({ ok: false, error: 'Send JSON.' }, 415);
  const viewer = await deps.readSession().catch(() => null);
  if (!viewer || !viewer.userId) return json({ ok: false, code: 'sign_in', error: 'Sign in to vote.' }, 401);
  if (!deps.allowHit(`ballot-save:${viewer.userId}`, BALLOT_LIMITS.savesPerMinute, 60_000)) {
    return json({ ok: false, error: 'Too many saves. Wait a minute and try again.' }, 429);
  }
  const now = deps.now ? deps.now() : new Date();
  if (effectiveStatus(def, await deps.getOverride(slug), now) !== 'open') {
    return json({ ok: false, code: 'not_open', error: 'Voting is not open.' }, 409);
  }
  // Only the questions that reached the ballot: a held-back question is refused like an unknown one.
  const resolved = await resolveFor(def, deps, now);
  if (resolved === 'unavailable') {
    return json(
      { ok: false, code: 'unavailable', error: "Voting is paused: we can't reach the vote store. Your vote was not recorded; please try again shortly." },
      503,
    );
  }
  if (resolved.state !== 'ready') return json({ ok: false, code: 'not_open', error: 'Voting is not open.' }, 409);
  const body = await request.json().catch(() => null);
  const parsed = parseVotes(resolved.votable, body);
  if (!parsed.ok) return json({ ok: false, error: parsed.error }, 400);
  const saved = await deps.saveVotes(resolved.votable, viewer.userId, parsed.votes);
  if (!saved.ok && saved.code === 'unavailable') {
    return json(
      { ok: false, code: 'unavailable', error: "Voting is paused: we can't reach the vote store. Your vote was not recorded; please try again shortly." },
      503,
    );
  }
  if (!saved.ok && saved.code === 'not_eligible') {
    return json({ ok: false, code: 'not_eligible', error: 'You are not eligible to vote on this ballot.' }, 403);
  }
  if (!saved.ok) return json({ ok: false, code: 'not_open', error: 'Voting is not open.' }, 409);
  return json({ ok: true, savedAt: saved.savedAt, votes: await deps.myVotes(slug, viewer.userId) });
}
