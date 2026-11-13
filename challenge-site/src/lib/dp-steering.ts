/**
 * V1.0 steering sweep (owner, 2026-11-10; docs/DP-V1-STEERING-SWEEP-SPEC.md).
 *
 * After the editorial freeze every open proposal gets a recorded steering decision. Two steering members
 * must agree (same decision and, for accept revised, the same text) before Gov Hub
 * carries the outcome out. Gov Hub keeps the analysis runs, batches, votes and outcomes; this module
 * holds the shapes the DP site reads from its steering API and normalizes them, so a missing or
 * renamed field shows as empty instead of breaking the page. Client-safe (no server imports).
 */
import type { GovHubDraftProposal } from '@/lib/govhub';

export type SteeringDecision = 'accept' | 'accept_revised' | 'decline' | 'defer';
export type SteeringRecommendation = SteeringDecision | 'needs_person';
export type SteeringState = 'none' | 'one' | 'split' | 'ready' | 'done';

export const DECISION_LABEL: Record<string, string> = {
  accept: 'Accept',
  accept_revised: 'Accept revised',
  decline: 'Reject',
  reject: 'Reject',
  defer: 'Defer to 1.1',
  needs_person: 'Needs a person',
};

export const STATE_LABEL: Record<SteeringState, string> = {
  none: 'No votes',
  one: 'One vote, needs a second',
  split: 'Split, another vote settles it',
  ready: 'Two agree, being carried out',
  done: 'Done',
};

/** The status tabs on a steering page: still to decide, or which way it went once carried out. */
export type SteeringTab = 'open' | 'accepted' | 'deferred' | 'declined';
export const STEERING_TABS: Array<{ key: SteeringTab; label: string; dot: string }> = [
  { key: 'open', label: 'Open', dot: 'bg-amber-500 text-slate-950' },
  { key: 'accepted', label: 'Accepted', dot: 'bg-emerald-500 text-slate-950' },
  { key: 'deferred', label: 'Deferred', dot: 'bg-sky-500 text-slate-950' },
  { key: 'declined', label: 'Declined', dot: 'bg-rose-500 text-white' },
];
const OUTCOME_TAB: Record<string, SteeringTab> = {
  accept: 'accepted',
  accept_revised: 'accepted',
  defer: 'deferred',
  decline: 'declined',
  reject: 'declined',
};

const isSteeringTab = (v: unknown): v is SteeringTab => STEERING_TABS.some((t) => t.key === v);

/**
 * An item stays Open until its outcome is carried out (an outcome that failed to apply is still open).
 * A closed stage's saved items say their tab; that wins.
 */
export function steeringTab(item: Pick<SteeringItem, 'state' | 'outcome'> & { tab?: SteeringTab | null }): SteeringTab {
  if (item.tab) return item.tab;
  const o = item.outcome;
  if (!o || o.error || (!o.executedAt && item.state !== 'done')) return 'open';
  return OUTCOME_TAB[o.decision] || 'open';
}

export function steeringTabCounts(items: Array<Pick<SteeringItem, 'state' | 'outcome' | 'tab'>>): Record<SteeringTab, number> {
  const counts: Record<SteeringTab, number> = { open: 0, accepted: 0, deferred: 0, declined: 0 };
  for (const i of items) counts[steeringTab(i)] += 1;
  return counts;
}

/** Front-matter documents steering decides like the DPs (spec, rule 8). */
export const FRONT_MATTER: Array<{ ml: string; title: string }> = [
  { ml: 'ML-Draft-026', title: 'Introduction' },
  { ml: 'ML-Draft-031', title: 'About This Digital Monument' },
  { ml: 'ML-Draft-032', title: 'Acknowledgements' },
  { ml: 'ML-Draft-033', title: 'Cover' },
];
const FRONT_MATTER_TITLE: Record<string, string> = Object.fromEntries(FRONT_MATTER.map((f) => [f.ml, f.title]));

export function frontMatterTitle(ml: string): string | null {
  return FRONT_MATTER_TITLE[normalizeMl(ml) || ''] || null;
}

/** "ml-draft-26" → "ML-Draft-026" (Gov Hub refs are three digits); null when it is not an ML-Draft ref. */
export function normalizeMl(raw: string | null | undefined): string | null {
  const match = String(raw || '').trim().match(/^ml-draft-(\d{1,4})$/i);
  return match ? `ML-Draft-${match[1].padStart(3, '0')}` : null;
}

export type SteeringAnalysis = {
  id: string;
  runId: string | null;
  runLabel: string | null;
  recommendation: SteeringRecommendation | null;
  revisedText: string | null;
  confidence: 'high' | 'medium' | 'low' | null;
  summary: string;
  reasons: string[];
  conflicts: Array<{ proposalId: string | null; mlNumber: string | null; section: string | null; note: string }>;
  evidence: Array<{ type: string; ref: string; quote: string | null }>;
  dependsOn: string[];
  batchKey: string | null;
  verified: boolean;
  verifierNote: string | null;
  createdAt: string | null;
};

export type SteeringVoteRow = {
  id: string | null;
  userId: string | null;
  voterName: string;
  decision: string;
  revisedText: string | null;
  agreesWithAnalysis: boolean | null;
  note: string | null;
  batchId: string | null;
  mine: boolean;
  updatedAt: string | null;
};

export type SteeringOutcome = {
  decision: string;
  executedAt: string | null;
  resultProposalId: string | null;
  error: string | null;
};

export type SteeringItem = {
  proposalId: string;
  proposal: GovHubDraftProposal;
  analysis: SteeringAnalysis | null;
  stale: boolean;
  votes: SteeringVoteRow[];
  state: SteeringState;
  outcome: SteeringOutcome | null;
  /** Gov Hub's tab for the item (always sent for a closed stage). */
  tab: SteeringTab | null;
  /** The open stage the item belongs to, when Gov Hub says (two stages can be open together). */
  stageKey: string | null;
};

export type SteeringStageKind = 'proposals' | 'review' | 'signoff';

/**
 * Stage 1 (proposal review), Stage 2 (cross-DP), Stage 3 (style), Final (sign-off). One is open at a
 * time, except that Stage 2 can open alongside Stage 1. What a stage accepted opens in the next as
 * carried items; a closed stage is a public, read-only record.
 */
export type SteeringStage = {
  key: string;
  title: string;
  position: number;
  kind: SteeringStageKind;
  status: 'open' | 'closed' | 'upcoming';
  nextTitle: string | null;
  description: string | null;
  openedAt: string | null;
  closedAt: string | null;
  closedByName: string | null;
  closeNote: string | null;
  totals: Record<SteeringTab, number> | null;
};

export type SteeringReviewDecision = 'keep' | 'follow_up' | 'defer';
export const REVIEW_LABEL: Record<SteeringReviewDecision, string> = {
  keep: 'Keep',
  follow_up: 'Keep, with a follow-up edit',
  defer: 'Defer to 1.1',
};
export type SteeringCheck = 'clean' | 'flagged' | 'unchecked';
export const CHECK_LABEL: Record<SteeringCheck, string> = {
  clean: 'No issue found',
  flagged: 'Flagged',
  unchecked: 'Not checked yet',
};

export type SteeringReview = {
  id: string;
  userId: string | null;
  voterName: string;
  decision: SteeringReviewDecision;
  note: string | null;
  bulk: boolean;
  mine: boolean;
};

/** An item an earlier stage accepted, reviewed again in this one against this stage's analysis. */
export type SteeringCarriedItem = {
  proposalId: string;
  proposal: GovHubDraftProposal;
  /** The revised copy that went in, when the earlier decision was accept with revised wording. */
  resultProposal: GovHubDraftProposal | null;
  carriedFrom: string | null;
  earlier: { stage: string | null; outcome: SteeringOutcome | null; votes: SteeringVoteRow[]; analysis: SteeringAnalysis | null };
  /** Carried more than once: how the stage before reviewed it. */
  previousReview: { stage: string | null; decision: string | null; keptByDefault: boolean; reviews: SteeringReview[] } | null;
  analysis: SteeringAnalysis | null;
  check: SteeringCheck;
  reviews: SteeringReview[];
  decision: SteeringReviewDecision | null;
  state: 'none' | 'one' | 'split' | 'done';
  tab: SteeringTab;
  /** Nobody reviewed it before the stage closed, so it was kept. */
  keptByDefault: boolean;
};

export type SteeringSignoff = {
  signed: boolean;
  needed: number;
  signoffs: Array<{ id: string; voterName: string; note: string | null; current: boolean; mine: boolean; createdAt: string | null }>;
};

/** Stage 4 (Final read): where one document stands. */
export type SteeringFinalStatus = 'not_read' | 'open' | 'needs_recheck' | 'clean' | 'signed';
export type SteeringFinal = {
  status: SteeringFinalStatus;
  label: string;
  /** The latest check of this document: which round read it and when. */
  check: { round: number; runLabel: string; checkedAt: string | null; findings: number } | null;
  openFixes: number;
  openDecisions: number;
  canSign: boolean;
};
/** One round of Stage 4: what it read and what it found. */
export type SteeringFinalRound = {
  round: number;
  label: string;
  importedAt: string | null;
  documentsRead: number;
  documentsClean: number;
  findings: number;
};

const FINAL_STATUSES: SteeringFinalStatus[] = ['not_read', 'open', 'needs_recheck', 'clean', 'signed'];

export function normalizeFinal(raw: unknown): SteeringFinal | null {
  if (!raw || typeof raw !== 'object') return null;
  const f = obj(raw);
  const status = FINAL_STATUSES.includes(str(f.status) as SteeringFinalStatus) ? (str(f.status) as SteeringFinalStatus) : 'not_read';
  const c = f.check && typeof f.check === 'object' ? obj(f.check) : null;
  return {
    status,
    label: str(f.label) || status,
    check: c ? { round: num(c.round), runLabel: str(c.run_label), checkedAt: strOrNull(c.checked_at), findings: num(c.findings) } : null,
    openFixes: num(f.open_fixes),
    openDecisions: num(f.open_decisions),
    canSign: f.can_sign === true,
  };
}

export function normalizeFinalRounds(raw: unknown): SteeringFinalRound[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.map((r) => {
    const o = obj(r);
    return {
      round: num(o.round),
      label: str(o.label),
      importedAt: strOrNull(o.imported_at),
      documentsRead: num(o.documents_read),
      documentsClean: num(o.documents_clean),
      findings: num(o.findings),
    };
  });
}

export type SteeringBatch = {
  id: string;
  key: string;
  kind: SteeringRecommendation;
  title: string;
  summary: string;
  proposalIds: string[];
  /** Spans every document (e.g. the "(Non-Normative)" headings): approving votes on all of its items. */
  bookWide: boolean;
};

export type SteeringDocument = {
  mlNumber: string;
  title: string;
  items: SteeringItem[];
  batches: SteeringBatch[];
  runs: Array<{ id: string; label: string; model: string | null; createdAt: string | null }>;
  viewerUserId: string | null;
  stage: SteeringStage | null;
  /** Every open stage, earliest first: two while Stage 2 runs alongside Stage 1. */
  openStages: SteeringStage[];
  carried: SteeringCarriedItem[];
  /** Final stage only. */
  signoff: SteeringSignoff | null;
  /** Stage 4 only: read, re-check and sign-off status. */
  final: SteeringFinal | null;
  /** A closed stage's saved record: nothing can be voted on. */
  readOnly: boolean;
};

export type SteeringOverviewRow = {
  mlNumber: string;
  title: string;
  frontMatter: boolean;
  open: number;
  analysed: number;
  stale: number;
  votes: Record<SteeringState, number>;
  batches: Array<{ id: string; key: string; kind: string; title: string; count: number }>;
  /** Open / Accepted / Deferred / Declined, when Gov Hub sends them. */
  tabs: Record<SteeringTab, number> | null;
  /** Items carried in from the stage before: how many, and how many are still open, flagged or unchecked. */
  carried: { count: number; open: number; flagged: number; unchecked: number } | null;
  /** Final stage: whether two members signed off the current text, and how many have. */
  signoff: { signed: boolean; count: number } | null;
  /** Stage 4: read, re-check and sign-off status. */
  final: SteeringFinal | null;
  /** False when Gov Hub's overview did not list this document (front matter shown anyway). */
  listed: boolean;
};

export type BatchApproveResult = {
  voted: number;
  executed: string[];
  pendingSecond: string[];
  failed: Array<{ proposalId: string; error: string }>;
};

// ---------- normalizers (Gov Hub JSON → the shapes above) ----------

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v));
const strOrNull = (v: unknown): string | null => (v === null || v === undefined || v === '' ? null : String(v));
const num = (...vals: unknown[]): number => {
  for (const v of vals) {
    const n = Number(v);
    if (v !== undefined && v !== null && Number.isFinite(n)) return n;
  }
  return 0;
};
/** A list Gov Hub may send as JSON text (the model's JSON columns) or as an array. */
const jsonList = (v: unknown): unknown[] => {
  if (typeof v === 'string') {
    try {
      return arr(JSON.parse(v));
    } catch {
      return [];
    }
  }
  return arr(v);
};
const boolOrNull = (v: unknown): boolean | null => (v === true || v === false ? v : null);

const STATES: SteeringState[] = ['none', 'one', 'split', 'ready', 'done'];
function toState(v: unknown, votes: SteeringVoteRow[], outcome: SteeringOutcome | null): SteeringState {
  const s = str(v).toLowerCase();
  if ((STATES as string[]).includes(s)) return s as SteeringState;
  if (outcome?.executedAt) return 'done';
  if (!votes.length) return 'none';
  return votes.length === 1 ? 'one' : 'split';
}

export function normalizeAnalysis(raw: unknown): SteeringAnalysis | null {
  const a = obj(raw);
  if (!Object.keys(a).length) return null;
  return {
    id: str(a.id),
    runId: strOrNull(a.run_id),
    runLabel: strOrNull(a.run_label ?? obj(a.run).label),
    recommendation: (strOrNull(a.recommendation)?.toLowerCase() as SteeringRecommendation | undefined) || null,
    revisedText: strOrNull(a.revised_text),
    confidence: (strOrNull(a.confidence)?.toLowerCase() as SteeringAnalysis['confidence']) || null,
    summary: str(a.summary),
    reasons: jsonList(a.reasons).map(str).filter(Boolean),
    conflicts: jsonList(a.conflicts).map((c) => {
      const o = obj(c);
      return {
        proposalId: strOrNull(o.proposal_id),
        mlNumber: strOrNull(o.ml_number),
        section: strOrNull(o.section),
        note: str(o.note),
      };
    }),
    evidence: jsonList(a.evidence).map((e) => {
      const o = obj(e);
      return { type: str(o.type) || 'file', ref: str(o.ref), quote: strOrNull(o.quote) };
    }),
    dependsOn: jsonList(a.depends_on).map(str).filter(Boolean),
    batchKey: strOrNull(a.batch_key),
    verified: Boolean(a.verified),
    verifierNote: strOrNull(a.verifier_note),
    createdAt: strOrNull(a.created_at),
  };
}

export function normalizeVote(raw: unknown, viewerUserId: string | null): SteeringVoteRow {
  const v = obj(raw);
  const userId = strOrNull(v.user_id ?? obj(v.user).id);
  return {
    id: strOrNull(v.id),
    userId,
    voterName: str(v.voter_name ?? v.user_name ?? v.name ?? obj(v.user).name) || 'Steering member',
    decision: str(v.decision).toLowerCase(),
    revisedText: strOrNull(v.revised_text),
    agreesWithAnalysis: boolOrNull(v.agrees_with_analysis ?? v.agrees),
    note: strOrNull(v.note),
    batchId: strOrNull(v.batch_id),
    mine: v.mine === true || v.is_mine === true || Boolean(viewerUserId && userId && userId === viewerUserId),
    updatedAt: strOrNull(v.updated_at ?? v.created_at),
  };
}

function normalizeOutcome(raw: unknown): SteeringOutcome | null {
  const o = obj(raw);
  if (!Object.keys(o).length) return null;
  return {
    decision: str(o.decision).toLowerCase(),
    executedAt: strOrNull(o.executed_at),
    resultProposalId: strOrNull(o.result_proposal_id),
    error: strOrNull(o.error),
  };
}

export function normalizeItem(raw: unknown, viewerUserId: string | null): SteeringItem | null {
  const it = obj(raw);
  // Gov Hub may nest the proposal ({proposal, analysis, …}) or send the proposal's fields flat.
  const proposal = obj(it.proposal ?? it) as unknown as GovHubDraftProposal;
  const proposalId = str(it.proposal_id ?? proposal.id);
  if (!proposalId) return null;
  const votes = arr(it.votes ?? it.active_votes).map((v) => normalizeVote(v, viewerUserId));
  const outcome = normalizeOutcome(it.outcome);
  return {
    proposalId,
    proposal: { ...proposal, id: proposalId, status: str(proposal.status) || 'pending' },
    analysis: normalizeAnalysis(it.analysis),
    stale: Boolean(it.stale ?? obj(it.analysis).stale),
    votes,
    state: toState(it.state, votes, outcome),
    outcome,
    tab: isSteeringTab(it.tab) ? it.tab : null,
    stageKey: strOrNull(it.stage_key),
  };
}

const REVIEW_DECISIONS: SteeringReviewDecision[] = ['keep', 'follow_up', 'defer'];
const isReview = (v: unknown): v is SteeringReviewDecision => REVIEW_DECISIONS.includes(v as SteeringReviewDecision);

function normalizeReview(raw: unknown, viewerUserId: string | null): SteeringReview | null {
  const r = obj(raw);
  if (!isReview(r.decision)) return null;
  const userId = strOrNull(r.user_id);
  return {
    id: str(r.id),
    userId,
    voterName: str(r.voter_name) || 'Steering member',
    decision: r.decision,
    note: strOrNull(r.note),
    bulk: r.bulk === true,
    mine: r.mine === true || Boolean(viewerUserId && userId === viewerUserId),
  };
}

const reviews = (raw: unknown, viewerUserId: string | null) =>
  arr(raw).map((r) => normalizeReview(r, viewerUserId)).filter((r): r is SteeringReview => Boolean(r));

const proposalOrNull = (raw: unknown): GovHubDraftProposal | null => {
  const p = obj(raw);
  return str(p.id) ? (p as unknown as GovHubDraftProposal) : null;
};

export function normalizeCarried(raw: unknown, viewerUserId: string | null): SteeringCarriedItem | null {
  const it = obj(raw);
  const proposalId = str(it.proposal_id);
  if (!proposalId) return null;
  const earlier = obj(it.earlier);
  const prev = it.previous_review ? obj(it.previous_review) : null;
  const check = str(it.check);
  const state = str(it.state);
  return {
    proposalId,
    proposal: { ...(obj(it.proposal) as unknown as GovHubDraftProposal), id: proposalId },
    resultProposal: proposalOrNull(it.result_proposal ?? earlier.result_proposal),
    carriedFrom: strOrNull(it.carried_from),
    earlier: {
      stage: strOrNull(earlier.stage),
      outcome: normalizeOutcome(earlier.outcome),
      votes: arr(earlier.votes).map((v) => normalizeVote(v, viewerUserId)),
      analysis: normalizeAnalysis(earlier.analysis),
    },
    previousReview: prev
      ? {
          stage: strOrNull(prev.stage),
          decision: strOrNull(prev.decision),
          keptByDefault: prev.kept_by_default === true,
          reviews: reviews(prev.reviews, null),
        }
      : null,
    analysis: normalizeAnalysis(it.analysis),
    check: check === 'clean' || check === 'flagged' ? check : 'unchecked',
    reviews: reviews(it.reviews, viewerUserId),
    decision: isReview(it.decision) ? it.decision : null,
    state: state === 'one' || state === 'split' || state === 'done' ? state : 'none',
    tab: isSteeringTab(it.tab) ? it.tab : 'open',
    keptByDefault: it.kept_by_default === true,
  };
}

export function normalizeSignoff(raw: unknown, viewerUserId: string | null): SteeringSignoff | null {
  if (!raw) return null;
  const s = obj(raw);
  return {
    signed: s.signed === true,
    needed: num(s.needed) || 2,
    signoffs: arr(s.signoffs).map((x) => {
      const o = obj(x);
      return {
        id: str(o.id),
        voterName: str(o.voter_name) || 'Steering member',
        note: strOrNull(o.note),
        current: o.current === true,
        mine: o.mine === true || Boolean(viewerUserId && str(o.user_id) === viewerUserId),
        createdAt: strOrNull(o.created_at),
      };
    }),
  };
}

function normalizeTabs(raw: unknown): Record<SteeringTab, number> | null {
  const t = obj(raw);
  if (!Object.keys(t).length) return null;
  return { open: num(t.open), accepted: num(t.accepted), deferred: num(t.deferred), declined: num(t.declined) };
}

export function normalizeStage(raw: unknown): SteeringStage | null {
  const p = obj(raw);
  const key = str(p.key);
  if (!key) return null;
  const status = str(p.status);
  const kind = str(p.kind);
  return {
    key,
    title: str(p.title) || key,
    position: num(p.position),
    kind: kind === 'review' || kind === 'signoff' ? kind : 'proposals',
    status: status === 'closed' || status === 'upcoming' ? status : 'open',
    nextTitle: strOrNull(p.next_title),
    description: strOrNull(p.description),
    openedAt: strOrNull(p.opened_at),
    closedAt: strOrNull(p.closed_at),
    closedByName: strOrNull(p.closed_by_name),
    closeNote: strOrNull(p.close_note),
    totals: normalizeTabs(p.totals),
  };
}

export function normalizeStages(raw: unknown): SteeringStage[] {
  const d = obj(raw);
  return arr(Array.isArray(raw) ? raw : d.stages)
    .map(normalizeStage)
    .filter((p): p is SteeringStage => Boolean(p))
    .sort((a, b) => a.position - b.position);
}

function normalizeBatch(raw: unknown): SteeringBatch {
  const b = obj(raw);
  const fromItems = arr(b.items)
    .map((i) => (typeof i === 'string' ? i : str(obj(i).proposal_id ?? obj(obj(i).proposal).id ?? obj(i).id)))
    .filter(Boolean);
  const ids = jsonList(b.proposal_ids).map(str).filter(Boolean);
  return {
    id: str(b.id),
    key: str(b.key),
    kind: (str(b.kind).toLowerCase() || 'needs_person') as SteeringRecommendation,
    title: str(b.title) || str(b.key) || 'Batch',
    summary: str(b.summary),
    proposalIds: ids.length ? ids : fromItems,
    bookWide: b.book_wide === true,
  };
}

/** GET /api/doc/draft/<ml>/steering/ → SteeringDocument. knownViewerId marks "mine" when Gov Hub does not. */
export function normalizeSteeringDocument(ml: string, raw: unknown, knownViewerId?: string | null): SteeringDocument {
  const d = obj(raw);
  const viewerUserId = strOrNull(d.viewer_user_id ?? obj(d.viewer).id) || knownViewerId || null;
  const items = arr(d.items)
    .map((i) => normalizeItem(i, viewerUserId))
    .filter((i): i is SteeringItem => Boolean(i));
  // Batch items Gov Hub sends only inside the batch (not in items) still need a row.
  const known = new Set(items.map((i) => i.proposalId));
  for (const b of arr(d.batches)) {
    for (const bi of arr(obj(b).items)) {
      if (typeof bi === 'string') continue;
      const item = normalizeItem(bi, viewerUserId);
      if (item && !known.has(item.proposalId)) {
        items.push(item);
        known.add(item.proposalId);
      }
    }
  }
  const mlNumber = normalizeMl(str(d.ml_number) || ml) || ml;
  return {
    mlNumber,
    title: frontMatterTitle(mlNumber) || str(d.title) || mlNumber,
    items,
    batches: arr(d.batches).map(normalizeBatch),
    runs: arr(d.runs).map((r) => {
      const o = obj(r);
      return { id: str(o.id), label: str(o.label), model: strOrNull(o.model), createdAt: strOrNull(o.created_at) };
    }),
    viewerUserId,
    stage: normalizeStage(d.stage),
    openStages: normalizeStages(d.open_stages),
    carried: arr(d.carried)
      .map((c) => normalizeCarried(c, viewerUserId))
      .filter((c): c is SteeringCarriedItem => Boolean(c)),
    signoff: normalizeSignoff(d.signoff, viewerUserId),
    final: normalizeFinal(d.final),
    readOnly: d.read_only === true,
  };
}

/** The overview's stage and viewer fields (the rows come from normalizeOverview). */
export function normalizeOverviewMeta(raw: unknown): {
  stage: SteeringStage | null;
  stages: SteeringStage[];
  viewerIsSteering: boolean;
  /** Every open stage, earliest first. */
  openStages: SteeringStage[];
  /** The stage that closes next: the earliest open one. */
  closingStageKey: string | null;
  /** The stage a steering member can open alongside the open one, if any. */
  canOpenNext: { key: string; title: string } | null;
  /** Open proposals in each open stage. */
  openByStage: Record<string, number>;
  /** Stage 4: one entry per round so far. */
  finalRounds: SteeringFinalRound[] | null;
} {
  const d = obj(raw);
  const next = obj(d.can_open_next);
  return {
    stage: normalizeStage(d.stage),
    stages: normalizeStages(d.stages),
    viewerIsSteering: d.viewer_is_steering === true,
    openStages: normalizeStages(d.open_stages),
    closingStageKey: strOrNull(d.closing_stage_key),
    canOpenNext: str(next.key) ? { key: str(next.key), title: str(next.title) || str(next.key) } : null,
    openByStage: Object.fromEntries(Object.entries(obj(d.open_by_stage)).map(([k, v]) => [k, num(v)])),
    finalRounds: normalizeFinalRounds(d.final_rounds),
  };
}

// ---------- Stage 2 by issue ----------

/** Where an item sits: its document, for the vote and for Ask Deepi. */
type InDocument = { mlNumber: string; docKey: string | null; docTitle: string | null };

/** One thing the cross-DP check found, with the fixes it filed and the accepted changes it flagged. */
export type SteeringFinding = {
  key: string;
  title: string;
  type: string | null;
  severity: string | null;
  summary: string | null;
  /** Steering has to decide something a text fix cannot. */
  needsDecision: boolean;
  /** The options the review laid out, with its recommendation. */
  decision: { options: string[]; recommended: string | null; note: string | null } | null;
  noFixReason: string | null;
  discussion: SteeringDiscussion;
  documents: string[];
  items: Array<SteeringItem & InDocument>;
  carried: Array<SteeringCarriedItem & InDocument>;
};

export type SteeringDecisionChoice = { key: string; label: string };

/** Votes (for findings that need a decision) and comments on one cross-DP finding. */
export type SteeringDiscussion = {
  choices: SteeringDecisionChoice[];
  votes: Array<{ id: string; userId: string; voterName: string | null; choice: string; note: string | null; createdAt: string | null; mine: boolean }>;
  tally: Record<string, number>;
  settledChoice: string | null;
  myChoice: string | null;
  myNote: string | null;
  comments: Array<{ id: string; userId: string; authorName: string | null; body: string; createdAt: string | null; mine: boolean }>;
};

export function normalizeDiscussion(raw: unknown, viewerUserId: string | null): SteeringDiscussion {
  const d = obj(raw);
  const tally: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj(d.tally))) if (typeof v === 'number') tally[k] = v;
  return {
    choices: arr(d.choices)
      .map((c) => ({ key: str(obj(c).key), label: str(obj(c).label) }))
      .filter((c) => c.key && c.label),
    votes: arr(d.votes).map((v) => {
      const o = obj(v);
      return {
        id: str(o.id),
        userId: str(o.user_id),
        voterName: strOrNull(o.voter_name),
        choice: str(o.choice),
        note: strOrNull(o.note),
        createdAt: strOrNull(o.created_at),
        mine: !!viewerUserId && str(o.user_id) === viewerUserId,
      };
    }),
    tally,
    settledChoice: strOrNull(d.settled_choice),
    myChoice: strOrNull(d.my_choice),
    myNote: strOrNull(d.my_note),
    comments: arr(d.comments).map((c) => {
      const o = obj(c);
      return {
        id: str(o.id),
        userId: str(o.user_id),
        authorName: strOrNull(o.author_name),
        body: str(o.body),
        createdAt: strOrNull(o.created_at),
        mine: !!viewerUserId && str(o.user_id) === viewerUserId,
      };
    }),
  };
}

export type SteeringIssueGroup = {
  key: string;
  title: string;
  summary: string | null;
  tabs: Record<SteeringTab, number>;
  findings: SteeringFinding[];
};

export type SteeringIssues = {
  stage: SteeringStage | null;
  run: { label: string; model: string | null } | null;
  viewerIsSteering: boolean;
  /** Stage 4: one entry per round so far. */
  rounds: SteeringFinalRound[] | null;
  groups: SteeringIssueGroup[];
  totals: Record<SteeringTab, number>;
};

const NO_TABS: Record<SteeringTab, number> = { open: 0, accepted: 0, deferred: 0, declined: 0 };

/** GET /api/doc/steering/issues/ → the cross-DP findings in their groups. */
export function normalizeIssues(raw: unknown): SteeringIssues {
  const d = obj(raw);
  const viewerUserId = strOrNull(d.viewer_user_id);
  const where = (o: Json): InDocument | null => {
    const mlNumber = normalizeMl(str(o.ml_number));
    return mlNumber ? { mlNumber, docKey: strOrNull(o.doc_key), docTitle: strOrNull(o.doc_title) } : null;
  };
  const run = obj(d.run);
  return {
    stage: normalizeStage(d.stage),
    run: str(run.label) ? { label: str(run.label), model: strOrNull(run.model) } : null,
    viewerIsSteering: d.viewer_is_steering === true,
    rounds: normalizeFinalRounds(d.rounds),
    totals: normalizeTabs(d.totals) || NO_TABS,
    groups: arr(d.groups).map((g) => {
      const group = obj(g);
      return {
        key: str(group.key),
        title: str(group.title) || str(group.key),
        summary: strOrNull(group.summary),
        tabs: normalizeTabs(group.tabs) || NO_TABS,
        findings: arr(group.findings).map((f) => {
          const finding = obj(f);
          const items: SteeringFinding['items'] = [];
          for (const i of arr(finding.items)) {
            const item = normalizeItem(i, viewerUserId);
            const doc = where(obj(i));
            if (item && doc) items.push({ ...item, ...doc });
          }
          const carried: SteeringFinding['carried'] = [];
          for (const c of arr(finding.carried)) {
            const item = normalizeCarried(c, viewerUserId);
            const doc = where(obj(c));
            if (item && doc) carried.push({ ...item, ...doc });
          }
          return {
            key: str(finding.key),
            title: str(finding.title) || str(finding.key),
            type: strOrNull(finding.type),
            severity: strOrNull(finding.severity),
            summary: strOrNull(finding.summary),
            needsDecision: finding.needs_decision === true,
            decision: (() => {
              const dec = obj(finding.decision);
              const options = arr(dec.options).map(str).filter(Boolean);
              return options.length || str(dec.recommended)
                ? { options, recommended: strOrNull(dec.recommended), note: strOrNull(dec.note) }
                : null;
            })(),
            noFixReason: strOrNull(finding.no_fix_reason),
            documents: arr(finding.documents).map(str).filter(Boolean),
            items,
            carried,
            discussion: normalizeDiscussion(finding.discussion, viewerUserId),
          };
        }),
      };
    }),
  };
}

/** GET /api/doc/steering/overview/ → one row per document; front matter always listed, with its titles. */
export function normalizeOverview(raw: unknown): SteeringOverviewRow[] {
  const d = obj(raw);
  const list = Array.isArray(raw) ? raw : arr(d.documents ?? d.docs ?? d.items ?? d.overview);
  const rows: SteeringOverviewRow[] = list.map((r) => {
    const o = obj(r);
    const ml = normalizeMl(str(o.ml_number ?? o.ml)) || str(o.ml_number ?? o.ml);
    const v = obj(o.votes ?? o.votes_by_state ?? o.states);
    const counts = obj(o.counts);
    const fm = frontMatterTitle(ml);
    return {
      mlNumber: ml,
      title: fm || str(o.title) || ml,
      frontMatter: Boolean(fm) || o.front_matter === true,
      open: num(o.open_count, o.open, o.open_items, counts.open),
      analysed: num(o.analysed_count, o.analyzed_count, o.analysed, o.analyzed, counts.analysed, counts.analyzed),
      stale: num(o.stale_count, o.stale, counts.stale),
      votes: {
        none: num(v.none),
        one: num(v.one),
        split: num(v.split),
        ready: num(v.ready),
        done: num(v.done),
      },
      batches: arr(o.batches).map((b) => {
        const bo = obj(b);
        return {
          id: str(bo.id),
          key: str(bo.key),
          kind: str(bo.kind),
          title: str(bo.title) || str(bo.key),
          count: num(bo.count, bo.item_count, bo.size, jsonList(bo.proposal_ids).length),
        };
      }),
      tabs: normalizeTabs(o.tabs),
      carried: o.carried && typeof o.carried === 'object' && !Array.isArray(o.carried)
        ? (() => {
            const c = obj(o.carried);
            return { count: num(c.count), open: num(c.open), flagged: num(c.flagged), unchecked: num(c.unchecked) };
          })()
        : null,
      signoff: o.signoff ? { signed: obj(o.signoff).signed === true, count: num(obj(o.signoff).count) } : null,
      final: normalizeFinal(o.final),
      listed: true,
    };
  });
  const present = new Set(rows.map((r) => r.mlNumber));
  for (const fm of FRONT_MATTER) {
    if (present.has(fm.ml)) continue;
    rows.push({
      mlNumber: fm.ml,
      title: fm.title,
      frontMatter: true,
      open: 0,
      analysed: 0,
      stale: 0,
      votes: { none: 0, one: 0, split: 0, ready: 0, done: 0 },
      batches: [],
      tabs: null,
      carried: null,
      signoff: null,
      final: null,
      listed: false,
    });
  }
  return rows;
}

export function normalizeBatchApprove(raw: unknown): BatchApproveResult {
  const d = obj(raw);
  const ids = (v: unknown) => arr(v).map((x) => (typeof x === 'string' ? x : str(obj(x).proposal_id ?? obj(x).id)));
  return {
    voted: num(d.voted),
    executed: ids(d.executed),
    pendingSecond: ids(d.pending_second),
    failed: arr(d.failed).map((f) => ({ proposalId: str(obj(f).proposal_id), error: str(obj(f).error) })),
  };
}

/** What the viewer's click means relative to the analysis: true when it matches the recommendation. */
export function agreesWith(
  analysis: SteeringAnalysis | null,
  decision: SteeringDecision,
  revisedText?: string | null,
): boolean | null {
  if (!analysis?.recommendation || analysis.recommendation === 'needs_person') return null;
  if (analysis.recommendation !== decision) return false;
  if (decision !== 'accept_revised') return true;
  return squash(revisedText) === squash(analysis.revisedText);
}

/** Gov Hub compares revised texts after normalizing whitespace (spec, rule 4). */
export function squash(text: string | null | undefined): string {
  return String(text || '').replace(/\s+/g, ' ').trim();
}
