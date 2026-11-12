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

/** An item stays Open until its outcome is carried out (an outcome that failed to apply is still open). */
export function steeringTab(item: Pick<SteeringItem, 'state' | 'outcome'>): SteeringTab {
  const o = item.outcome;
  if (!o || o.error || (!o.executedAt && item.state !== 'done')) return 'open';
  return OUTCOME_TAB[o.decision] || 'open';
}

export function steeringTabCounts(items: Array<Pick<SteeringItem, 'state' | 'outcome'>>): Record<SteeringTab, number> {
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
};

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
  };
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
