/**
 * Proposal pads (/pads/proposals/<id>): one page per DP proposal that shows the change in its chapter, the record
 * behind it, and the ways to act on it. This file is pure (no runtime imports beyond other pure modules), so
 * scripts/proposal-pads.test.mjs can drive it with fixtures. proposal-pad.server.ts feeds it live Gov Hub data.
 *
 * Every input here is public: Gov Hub's proposal list (/api/doc/draft/<ML>/proposals/), the chapter blocks
 * (/chapter-passages/), the co-editor seats (/api/workgroups/<id>/co-editors/) and the closed steering stages
 * (/api/doc/steering/stages/<key>/documents/<ML>/, readable by anyone once a stage is closed).
 */
import { findPassageIndex, plainBlock, sectionTrail } from '@/lib/chapter-sections';
import { versionMarkerOf, type VersionMarker } from '@/lib/dp-v11';

/** The proposal fields a pad reads (a subset of Gov Hub's proposal JSON). */
export type RawProposal = {
  id: string;
  status?: string | null;
  patch_mode?: string | null;
  original_text?: string | null;
  proposed_text?: string | null;
  rationale?: string | null;
  author_name?: string | null;
  created_at?: string | null;
  reviewed_at?: string | null;
  reviewed_by_name?: string | null;
  review_note?: string | null;
  updated_at?: string | null;
  applicability?: string | null;
  applicability_hint?: string | null;
  created_on_revision_label?: string | null;
  anchor_hash?: string | null;
  approvals?: Array<{ user_name?: string | null; note?: string | null; created_at?: string | null }> | null;
  title_change?: boolean | null;
  version_marker?: string | null;
  revised_from_id?: string | null;
  revised_by_name?: string | null;
  edits?: Array<{ seq?: number; rule?: string | null; original_text?: string; proposed_text?: string; note?: string | null }> | null;
};

/** The part of a closed steering stage's item a pad shows. */
export type RawSteeringItem = {
  stageKey: string;
  stageTitle: string;
  analysis?: {
    recommendation?: string | null;
    confidence?: string | null;
    summary?: string | null;
    reasons?: string[] | null;
    conflicts?: Array<{ ml_number?: string | null; note?: string | null; section?: string | null }> | null;
    evidence?: Array<{ doc?: string | null }> | null;
  } | null;
  outcome?: { decision?: string | null; executed_at?: string | null } | null;
  votes?: Array<{ voter_name?: string | null; decision?: string | null; created_at?: string | null }> | null;
};

export type PadStatus = 'pending' | 'incorporated' | 'declined' | 'considered' | 'withdrawn' | 'other';

export const STATUS_LABEL: Record<PadStatus, string> = {
  pending: 'Open',
  incorporated: 'Incorporated',
  declined: 'Declined',
  considered: 'Closed',
  withdrawn: 'Withdrawn',
  other: 'Closed',
};

export type ChangeMode = 'replace' | 'insert_before' | 'insert_after';

/** Where one change sits in the current chapter, or null when its passage is not there. */
export type ChangeLocation = {
  start: number;
  end: number;
  section: string | null;
  contextBefore: string | null;
  blocks: string[];
  contextAfter: string | null;
  /** The anchor is exactly inside one block: the text around it, so only the anchor is highlighted. */
  exact: { pre: string; match: string; post: string } | null;
};

export type PadChange = {
  mode: ChangeMode;
  original: string;
  /** Empty for a deletion (duplicate-text bundles). */
  proposed: string;
  note: string | null;
  rule: string | null;
  location: ChangeLocation | null;
};

export type PadHistoryEvent = { at: string | null; text: string; href?: string };

export type PadRelated = { id: string; shortId: string; status: PadStatus; relation: string; snippet: string };

export type ProposalPad = {
  id: string;
  shortId: string;
  dpId: string | null;
  docLabel: string;
  mlNumber: string;
  status: PadStatus;
  statusLabel: string;
  marker: VersionMarker | null;
  /** One of the six pending proposals that sat on an old copy of the chapter until 20 Nov 2026. */
  rehomed: boolean;
  kindLabel: string;
  bundle: boolean;
  authorName: string;
  createdAt: string | null;
  createdOnRevisionLabel: string | null;
  rationale: string;
  reviewNote: string | null;
  approvals: Array<{ name: string; at: string | null; note: string | null }>;
  approvalsNeeded: number;
  titleChange: boolean;
  applicability: string;
  applicabilityHint: string | null;
  /** True when Gov Hub flags the anchor or any change's passage is missing from the current chapter. */
  anchorGone: boolean;
  changes: PadChange[];
  history: PadHistoryEvent[];
  steering: {
    stageTitle: string;
    recommendation: string | null;
    confidence: string | null;
    summary: string | null;
    reasons: string[];
    decision: string | null;
    votes: Array<{ name: string; decision: string }>;
  } | null;
  related: PadRelated[];
  /** DPs the proposal touches: its own chapter first, then chapters the steering analysis names. */
  dpsTouched: string[];
};

/** The 6 pending proposals moved onto their chapter's current row on 20 Nov 2026 (dp_v11_reopen_2026_11_20.py). */
export const REHOMED_2026_11_20 = ['89839fc2', '9d17433a', '33898fae', '981f8156', '0dbcc417', 'a01b6976'];
export const REOPENED_AT = '2026-11-20T22:20:00Z';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

export function shortId(id: string): string {
  return String(id || '').slice(0, 8).toLowerCase();
}

/** A pad URL's id: the full proposal id, or a prefix of at least 8 hex characters. */
export function normalizePadId(raw: string): string | null {
  const id = String(raw || '').trim().toLowerCase();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) return id;
  if (/^[0-9a-f]{8,32}$/.test(id)) return id;
  return null;
}

export function padIdMatches(param: string, proposalId: string): boolean {
  const want = normalizePadId(param);
  if (!want) return false;
  const id = String(proposalId || '').toLowerCase();
  return id === want || id.replace(/-/g, '').startsWith(want.replace(/-/g, ''));
}

export function padHref(id: string): string {
  return `/pads/proposals/${shortId(id)}`;
}

export function padStatus(raw: unknown): PadStatus {
  const s = String(raw || '').toLowerCase();
  return s === 'pending' || s === 'incorporated' || s === 'declined' || s === 'considered' || s === 'withdrawn'
    ? s
    : 'other';
}

function changeMode(patchMode: string): ChangeMode {
  if (patchMode === 'insert' || patchMode === 'insert_before') return 'insert_before';
  if (patchMode === 'insert_after') return 'insert_after';
  return 'replace';
}

export function kindLabel(patchMode: string, editCount: number): string {
  switch (patchMode) {
    case 'insert':
    case 'insert_before':
      return 'New text above a passage';
    case 'insert_after':
      return 'New text below a passage';
    case 'editorial_bundle':
      return `Style edits (${editCount})`;
    case 'dedup_bundle':
      return `Duplicate-text cleanup (${editCount} edits)`;
    default:
      return 'Changes a passage';
  }
}

/** Where `original` sits in the chapter blocks, with one block of context either side. */
export function locateChange(passages: string[], original: string): ChangeLocation | null {
  const text = String(original || '').trim();
  if (!text || !passages.length) return null;
  const start = findPassageIndex(passages, text);
  if (start < 0) return null;
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim()).length || 1;
  let end = Math.min(passages.length - 1, start + paragraphs - 1);
  // The passage may span fewer blocks than paragraphs (lists): stop once its last words are covered.
  const tail = plainBlock(text.split(/\n\s*\n/).filter((p) => p.trim()).pop() || '').toLowerCase().slice(-60);
  for (let i = start; i <= end; i++) {
    if (tail && plainBlock(passages[i]).toLowerCase().includes(tail)) {
      end = i;
      break;
    }
  }
  const blocks = passages.slice(start, end + 1);
  let exact: ChangeLocation['exact'] = null;
  if (blocks.length === 1) {
    const at = blocks[0].indexOf(text);
    if (at >= 0) exact = { pre: blocks[0].slice(0, at), match: text, post: blocks[0].slice(at + text.length) };
  }
  const trail = sectionTrail(passages, start);
  return {
    start,
    end,
    section: trail.length ? trail.join(' › ') : null,
    contextBefore: start > 0 ? passages[start - 1] : null,
    blocks,
    contextAfter: end + 1 < passages.length ? passages[end + 1] : null,
    exact,
  };
}

export function buildChanges(p: RawProposal, passages: string[]): PadChange[] {
  const patchMode = str(p.patch_mode) || 'replace';
  if ((patchMode === 'editorial_bundle' || patchMode === 'dedup_bundle') && p.edits?.length) {
    return [...p.edits]
      .sort((a, b) => Number(a.seq ?? 0) - Number(b.seq ?? 0))
      .map((e) => ({
        mode: 'replace' as const,
        original: str(e.original_text),
        proposed: str(e.proposed_text),
        note: e.note ? String(e.note) : null,
        rule: e.rule ? String(e.rule) : null,
        location: locateChange(passages, str(e.original_text)),
      }));
  }
  return [
    {
      mode: changeMode(patchMode),
      original: str(p.original_text),
      proposed: str(p.proposed_text),
      note: null,
      rule: null,
      location: locateChange(passages, str(p.original_text)),
    },
  ];
}

const DECISION_WORD: Record<string, string> = {
  accept: 'accept',
  decline: 'decline',
  defer: 'carry to Version 1.1',
  revise: 'accept with revisions',
};

function snippet(text: string, max = 140): string {
  const flat = String(text || '').replace(/[#*_`>]/g, '').replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function steeringSummary(items: RawSteeringItem[]): ProposalPad['steering'] {
  // The latest stage that analysed it (a cross-DP pass reads after the proposal pass).
  const item = [...items].reverse().find((i) => i.analysis) || items[items.length - 1];
  if (!item) return null;
  const a = item.analysis || {};
  return {
    stageTitle: item.stageTitle,
    recommendation: a.recommendation ? String(a.recommendation) : null,
    confidence: a.confidence ? String(a.confidence) : null,
    summary: a.summary ? String(a.summary) : null,
    reasons: (a.reasons || []).map(String).filter(Boolean),
    decision: item.outcome?.decision ? String(item.outcome.decision) : null,
    votes: (item.votes || []).map((v) => ({ name: str(v.voter_name) || 'Steering member', decision: str(v.decision) })),
  };
}

export function buildHistory(
  p: RawProposal,
  all: RawProposal[],
  steering: RawSteeringItem[],
  opts: { rehomed: boolean; marker: VersionMarker | null },
): PadHistoryEvent[] {
  const events: PadHistoryEvent[] = [];
  const byId = new Map(all.map((x) => [x.id, x]));

  // Earlier versions this one was revised from (oldest first).
  const chain: RawProposal[] = [];
  let cursor = p.revised_from_id ? byId.get(p.revised_from_id) : undefined;
  const seen = new Set([p.id]);
  while (cursor && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    chain.unshift(cursor);
    cursor = cursor.revised_from_id ? byId.get(cursor.revised_from_id) : undefined;
  }
  for (const prev of chain) {
    events.push({
      at: prev.created_at || null,
      text: `Earlier version filed by ${str(prev.author_name) || 'someone'}`,
      href: padHref(prev.id),
    });
  }

  const rev = p.created_on_revision_label ? ` on ${p.created_on_revision_label}` : '';
  events.push({
    at: p.created_at || null,
    text: p.revised_from_id
      ? `Revised version filed${p.revised_by_name ? ` by ${p.revised_by_name}` : ''}${rev}, credited to ${str(p.author_name) || 'the author'}`
      : `Filed by ${str(p.author_name) || 'someone'}${rev}`,
  });

  for (const a of p.approvals || []) {
    events.push({ at: a.created_at || null, text: `Approved by ${str(a.user_name) || 'a co-editor'} (co-editor)` });
  }

  for (const item of steering) {
    for (const v of item.votes || []) {
      const d = DECISION_WORD[str(v.decision)] || str(v.decision) || 'vote';
      events.push({ at: v.created_at || null, text: `${item.stageTitle}: ${str(v.voter_name) || 'a steering member'} voted to ${d}` });
    }
    if (item.outcome?.decision) {
      const d = str(item.outcome.decision);
      events.push({
        at: item.outcome.executed_at || null,
        text:
          d === 'defer'
            ? 'Steering committee carried it to Version 1.1'
            : `Steering committee decided: ${DECISION_WORD[d] || d}`,
      });
    }
  }

  const status = padStatus(p.status);
  if (status !== 'pending' && !steering.some((s) => s.outcome?.decision)) {
    events.push({
      at: p.reviewed_at || null,
      text: `${STATUS_LABEL[status]}${p.reviewed_by_name ? ` by ${p.reviewed_by_name}` : ''}`,
    });
  }

  if (opts.marker === 'reopened_v11') {
    events.push({ at: REOPENED_AT, text: 'Reopened for Version 1.1: the co-editors decide it' });
  }
  if (opts.rehomed) {
    events.push({
      at: REOPENED_AT,
      text: 'Moved onto the current chapter: it was filed on an older copy and was missing from the review list',
    });
  }

  for (const next of all.filter((x) => x.revised_from_id === p.id)) {
    events.push({
      at: next.created_at || null,
      text: `Revised into a new version${next.revised_by_name ? ` by ${next.revised_by_name}` : ''}`,
      href: padHref(next.id),
    });
  }

  return events
    .map((e, i) => ({ e, i }))
    .sort((a, b) => String(a.e.at || '').localeCompare(String(b.e.at || '')) || a.i - b.i)
    .map(({ e }) => e);
}

export function relatedProposals(p: RawProposal, all: RawProposal[]): PadRelated[] {
  const out: PadRelated[] = [];
  const add = (x: RawProposal, relation: string) => {
    if (x.id === p.id || out.some((o) => o.id === x.id)) return;
    out.push({
      id: x.id,
      shortId: shortId(x.id),
      status: padStatus(x.status),
      relation,
      snippet: snippet(str(x.proposed_text) || str(x.rationale)),
    });
  };
  if (p.revised_from_id) {
    const prev = all.find((x) => x.id === p.revised_from_id);
    if (prev) add(prev, 'Earlier version');
  }
  for (const x of all.filter((y) => y.revised_from_id === p.id)) add(x, 'Newer version');
  const anchor = plainBlock(str(p.original_text)).toLowerCase();
  const bundle = /_bundle$/.test(str(p.patch_mode));
  for (const x of all) {
    if (x.id === p.id || /_bundle$/.test(str(x.patch_mode)) || bundle) continue;
    const sameHash = p.anchor_hash && x.anchor_hash && p.anchor_hash === x.anchor_hash;
    const sameText = anchor.length > 20 && plainBlock(str(x.original_text)).toLowerCase() === anchor;
    if (sameHash || sameText) add(x, padStatus(x.status) === 'pending' ? 'Also open on this passage' : 'Same passage');
  }
  return out.slice(0, 12);
}

/** DP ids named by the steering analysis (conflicts and evidence), after the proposal's own. */
export function dpsTouched(dpId: string | null, steering: RawSteeringItem[], mlToDp: Record<string, string>): string[] {
  const out: string[] = dpId ? [dpId] : [];
  const add = (d: string | null | undefined) => {
    const id = String(d || '').trim().toUpperCase();
    if (/^DP\d{1,2}$/.test(id) && !out.includes(id)) out.push(id);
  };
  for (const s of steering) {
    for (const c of s.analysis?.conflicts || []) add(mlToDp[str(c.ml_number)] || null);
    for (const e of s.analysis?.evidence || []) add(str(e.doc));
  }
  return out;
}

export function buildProposalPad(input: {
  proposal: RawProposal;
  all: RawProposal[];
  passages: string[];
  steering: RawSteeringItem[];
  dpId: string | null;
  docLabel: string;
  mlNumber: string;
  approvalsNeeded: number;
  mlToDp: Record<string, string>;
}): ProposalPad {
  const p = input.proposal;
  const status = padStatus(p.status);
  const marker = versionMarkerOf(p);
  const rehomed = REHOMED_2026_11_20.includes(shortId(p.id));
  const patchMode = str(p.patch_mode) || 'replace';
  const changes = buildChanges(p, input.passages);
  const applicability = str(p.applicability) || 'applies';
  return {
    id: p.id,
    shortId: shortId(p.id),
    dpId: input.dpId,
    docLabel: input.docLabel,
    mlNumber: input.mlNumber,
    status,
    statusLabel: STATUS_LABEL[status],
    marker,
    rehomed,
    kindLabel: kindLabel(patchMode, p.edits?.length || 0),
    bundle: /_bundle$/.test(patchMode),
    authorName: str(p.author_name) || 'Someone',
    createdAt: p.created_at || null,
    createdOnRevisionLabel: p.created_on_revision_label || null,
    rationale: str(p.rationale),
    reviewNote: p.review_note ? String(p.review_note) : null,
    approvals: (p.approvals || []).map((a) => ({
      name: str(a.user_name) || 'A co-editor',
      at: a.created_at || null,
      note: a.note ? String(a.note) : null,
    })),
    approvalsNeeded: input.approvalsNeeded,
    titleChange: Boolean(p.title_change),
    applicability,
    applicabilityHint: p.applicability_hint ? String(p.applicability_hint) : null,
    anchorGone: applicability !== 'applies' || changes.some((c) => !c.location),
    changes,
    history: buildHistory(p, input.all, input.steering, { rehomed, marker }),
    steering: steeringSummary(input.steering),
    related: relatedProposals(p, input.all),
    dpsTouched: dpsTouched(input.dpId, input.steering, input.mlToDp),
  };
}

/** "1 of 2 co-editor approvals". */
export function approvalsLine(have: number, needed: number): string {
  return `${have} of ${needed} co-editor approval${needed === 1 ? '' : 's'}`;
}

/** The input a plain-language summary is written from; a summary is stale once this changes. */
export function summaryInput(p: RawProposal, docLabel: string): string {
  const edits = (p.edits || [])
    .map((e, i) => `Edit ${i + 1}${e.rule ? ` (${e.rule})` : ''}: replace "${str(e.original_text)}" with "${str(e.proposed_text) || '(delete)'}"${e.note ? `. Why: ${e.note}` : ''}`)
    .join('\n');
  return [
    `Chapter: ${docLabel}`,
    `Kind: ${kindLabel(str(p.patch_mode) || 'replace', p.edits?.length || 0)}`,
    `Passage: ${str(p.original_text)}`,
    `Proposed text: ${str(p.proposed_text)}`,
    edits ? `Edits:\n${edits}` : '',
    `Rationale: ${str(p.rationale)}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

/** A title when no stored summary has one: the proposal's own heading, else its first words. */
export function fallbackTitle(pad: Pick<ProposalPad, 'changes' | 'bundle' | 'kindLabel'>): string {
  if (pad.bundle) return pad.kindLabel;
  const text = pad.changes[0]?.proposed || '';
  const heading = /^#{1,6}\s+(.+)$/m.exec(text)?.[1];
  if (heading) return plainBlock(heading).slice(0, 90);
  const words = plainBlock(text).split(' ').filter(Boolean);
  return words.length ? `${words.slice(0, 9).join(' ')}${words.length > 9 ? '…' : ''}` : 'Proposal';
}

/** The Markdown Deepi reads with every message on a pad's chat. */
export function padChatContext(pad: ProposalPad, title: string, summary: string | null): string {
  const lines = [
    `# Proposal pad: ${title}`,
    `Chapter: ${pad.docLabel} (${pad.mlNumber}). Proposal id ${pad.id}.`,
    `Status: ${pad.statusLabel}${pad.marker === 'reopened_v11' ? ', reopened for Version 1.1' : ''}. ${approvalsLine(pad.approvals.length, pad.approvalsNeeded)}. The DP's co-editors decide it.`,
    `Kind: ${pad.kindLabel}. Proposed by ${pad.authorName}${pad.createdAt ? ` on ${pad.createdAt.slice(0, 10)}` : ''}.`,
    pad.anchorGone ? 'The passage it points at is no longer in the current chapter: it needs re-anchoring.' : '',
    summary ? `\n## Plain-language summary (AI-generated)\n${summary}` : '',
    '\n## The change',
  ];
  pad.changes.forEach((c, i) => {
    lines.push(
      pad.changes.length > 1 ? `\n### Edit ${i + 1}${c.rule ? ` (${c.rule})` : ''}` : '',
      c.location?.section ? `Section: ${c.location.section}` : 'Section: not found in the current chapter',
      c.location?.contextBefore ? `Text before: ${c.location.contextBefore}` : '',
      `${c.mode === 'replace' ? 'Passage replaced' : c.mode === 'insert_before' ? 'Inserted above this passage' : 'Inserted below this passage'}: ${c.original}`,
      `Proposed text: ${c.proposed || '(delete)'}`,
      c.note ? `Why: ${c.note}` : '',
      c.location?.contextAfter ? `Text after: ${c.location.contextAfter}` : '',
    );
  });
  lines.push(`\n## Rationale\n${pad.rationale || '(none)'}`);
  if (pad.reviewNote) lines.push(`\n## Decision notes\n${pad.reviewNote}`);
  if (pad.steering) {
    lines.push(
      `\n## Steering committee analysis (${pad.steering.stageTitle})`,
      pad.steering.summary || '',
      ...pad.steering.reasons.map((r) => `- ${r}`),
      pad.steering.decision ? `Steering decision: ${pad.steering.decision}` : '',
    );
  }
  lines.push('\n## History', ...pad.history.map((h) => `- ${h.at ? h.at.slice(0, 10) : ''} ${h.text}`));
  return lines.filter((l) => l !== '').join('\n');
}
