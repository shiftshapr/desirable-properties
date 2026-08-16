export type ContributionScope = 'message' | 'thread';

export type ContributionDestination = 'canopi' | 'govhub';

export type PatchMode = 'replace' | 'insert';

export interface ContributionHint {
  contributionReady: boolean;
  /** Set after user submits from this exchange — hides the draft CTA. */
  contributionSubmitted?: boolean;
  submittedDraftRef?: string | null;
  submittedMode?: ContributionSubmitMode | null;
  submittedSetId?: string | null;
  submittedAt?: string | null;
  recommendedScope?: ContributionScope | 'ambiguous';
  reason?: string;
  suggestedKind?: 'comment' | 'patch' | null;
  draftRefHint?: string | null;
  defaultScope?: ContributionScope;
}

export function isDraftRefFullyFiled(
  sets: ContributionSet[],
  draftRef: string | null | undefined,
  mode: ContributionSubmitMode | null = null,
): boolean {
  const ref = String(draftRef || '').trim().toUpperCase();
  if (!ref) return false;
  return sets.some((s) => {
    if (String(s.draftRef || '').trim().toUpperCase() !== ref) return false;
    if (mode && s.mode !== mode) return false;
    return s.status === 'complete' || s.status === 'partial';
  });
}

export function filedSetsForSourceTurn(
  sets: ContributionSet[],
  sourceTurnId: string | null | undefined,
): ContributionSet[] {
  if (!sourceTurnId) return [];
  return sets.filter(
    (s) => s.sourceTurnId === sourceTurnId
      && (s.status === 'complete' || s.status === 'partial'),
  );
}

export function shouldShowContributionCTA(
  hint: MessageContributionHint | null | undefined,
  opts?: { sourceTurnId?: string | null; contributionSets?: ContributionSet[] },
): boolean {
  if (!hint || isContributionRecordHint(hint)) return false;
  if ('contributionSubmitted' in hint && hint.contributionSubmitted) return false;
  if (opts?.sourceTurnId && opts.contributionSets?.length) {
    if (sourceTurnHasFiledSet(opts.contributionSets, opts.sourceTurnId)) return false;
  }
  if (opts?.contributionSets?.length && 'draftRefHint' in hint && hint.draftRefHint) {
    const filedForTurn = opts.sourceTurnId
      ? filedSetsForSourceTurn(opts.contributionSets, opts.sourceTurnId)
      : [];
    if (filedForTurn.some((s) => String(s.draftRef || '').trim().toUpperCase()
      === String(hint.draftRefHint || '').trim().toUpperCase())) {
      return false;
    }
  }
  return Boolean(hint.contributionReady);
}

export function markHintSubmitted(
  hint: ContributionHint,
  draftRef: string,
  mode: ContributionSubmitMode,
): ContributionHint {
  return {
    ...hint,
    contributionReady: false,
    contributionSubmitted: true,
    submittedDraftRef: draftRef,
    submittedMode: mode,
    submittedAt: new Date().toISOString(),
  };
}

/** Summaries of proposals already filed — pass to draft API to avoid duplicates. */
export function submittedProposalExclusionsFromMessages(
  messages: Array<{ sender?: string; text?: string; contributionRecord?: boolean; contributionHint?: MessageContributionHint | null }>,
): string[] {
  const exclusions: string[] = [];
  for (const m of messages) {
    if (m.sender !== 'assistant') continue;
    if (!m.contributionRecord && !isContributionRecordHint(m.contributionHint)) continue;
    const text = String(m.text || '').trim();
    if (!text) continue;

    const sectionMatches = text.matchAll(/^###\s+\d+\.\s+(.+)$/gm);
    for (const match of sectionMatches) {
      exclusions.push(String(match[1]).trim());
    }

    const anchorMatch = text.match(/\*\*Anchor passage\*\*\s*\n+([\s\S]*?)(?:\n\n\*\*|$)/);
    if (anchorMatch?.[1]) {
      exclusions.push(`Anchor: ${anchorMatch[1].trim().slice(0, 200)}`);
    }
  }
  return [...new Set(exclusions.filter(Boolean))];
}

/** Persisted on thread after submit — not a draft CTA. */
export interface ContributionRecordHint {
  type: 'contribution_record';
  contributionReady: false;
  mode: ContributionSubmitMode;
  draftRef: string;
  destination?: ContributionDestination;
  links?: DiscussDeepLink[];
  title?: string;
  setId?: string;
  sourceTurnId?: string | null;
}

export type ContributionSetStatus = 'staged' | 'partial' | 'complete' | 'superseded';
export type ProposalLedgerStatus = 'pending' | 'draft' | 'published' | 'updated' | 'withdrawn';

export interface LedgerProposal {
  proposalId: string;
  kind: 'patch' | 'comment';
  label: string;
  canopiMessageId?: string;
  canopiDraftId?: string;
  status: ProposalLedgerStatus;
  fingerprint: string;
  href?: string;
  /** Published message this revision supersedes (Hermes ledger only). */
  revisionOf?: string;
}

export interface ContributionSet {
  id: string;
  threadId: string;
  sourceTurnId?: string | null;
  draftRef: string;
  mode: ContributionSubmitMode;
  status: ContributionSetStatus;
  createdAt: string;
  recordTurnId?: string | null;
  title?: string | null;
  proposals: LedgerProposal[];
  /** Set-level link when this filing revises a prior published contribution. */
  supersedesMessageId?: string;
  supersedesSetId?: string;
  revisionOfProposalId?: string;
}

export type MessageContributionHint = ContributionHint | ContributionRecordHint;

export function isContributionRecordHint(
  hint: MessageContributionHint | null | undefined,
): hint is ContributionRecordHint {
  return Boolean(hint && typeof hint === 'object' && 'type' in hint && hint.type === 'contribution_record');
}

export interface ContributionProposal {
  id: string;
  kind: 'comment' | 'patch';
  payload: Record<string, unknown>;
}

export interface ContributionDraft {
  kind: 'comment' | 'patch';
  draftRef: string;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
  proposals?: ContributionProposal[];
  scope?: ContributionScope;
  destination?: ContributionDestination;
  /** True when Hermes recovered the draft heuristically after JSON failure. */
  recovered?: boolean;
  /** Revision of a published Canopi message — skips original CTA flow. */
  supersedesMessageId?: string;
  supersedesSetId?: string;
  revisionOfProposalId?: string;
  isRevision?: boolean;
}

export interface DiscussDeepLink {
  id: string;
  href: string;
  label: string;
  pageId?: string;
}

export type DiscussLinkKind = 'post' | 'draft';

/** Save to Canopi Discuss drafts vs publish immediately. */
export type ContributionSubmitMode = 'draft' | 'publish';

const STAGED_KEY = 'hermes-staged-proposals-v1';
const PENDING_DRAFT_KEY = 'hermes-pending-contribution-draft-v1';
const PENDING_USER_MESSAGES_KEY = 'hermes-pending-user-messages-v1';
const PENDING_THREAD_DRAFT = '__draft__';

export interface PendingUserMessage {
  clientId: string;
  threadId: string | null;
  text: string;
  timestamp: string;
  sendError?: string | null;
}

function pendingUserMessagesStore(): Record<string, PendingUserMessage[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(PENDING_USER_MESSAGES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, PendingUserMessage[]>)
      : {};
  } catch {
    return {};
  }
}

function writePendingUserMessagesStore(store: Record<string, PendingUserMessage[]>): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(PENDING_USER_MESSAGES_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota errors */
  }
}

export function pendingUserMessagesKey(threadId: string | null): string {
  return threadId || PENDING_THREAD_DRAFT;
}

export function savePendingUserMessage(entry: PendingUserMessage): void {
  if (typeof window === 'undefined') return;
  const key = pendingUserMessagesKey(entry.threadId);
  const store = pendingUserMessagesStore();
  const list = store[key] || [];
  const next = [...list.filter((row) => row.clientId !== entry.clientId), entry];
  store[key] = next;
  writePendingUserMessagesStore(store);
}

export function clearPendingUserMessage(clientId: string, threadId: string | null): void {
  if (typeof window === 'undefined') return;
  const key = pendingUserMessagesKey(threadId);
  const store = pendingUserMessagesStore();
  const list = store[key] || [];
  const next = list.filter((row) => row.clientId !== clientId);
  if (next.length) store[key] = next;
  else delete store[key];
  writePendingUserMessagesStore(store);
}

export function migratePendingUserMessages(fromThreadId: string | null, toThreadId: string): void {
  if (typeof window === 'undefined' || !toThreadId) return;
  const fromKey = pendingUserMessagesKey(fromThreadId);
  const toKey = pendingUserMessagesKey(toThreadId);
  if (fromKey === toKey) return;
  const store = pendingUserMessagesStore();
  const fromList = store[fromKey] || [];
  if (!fromList.length) return;
  const toList = store[toKey] || [];
  const merged = [...toList];
  for (const row of fromList) {
    if (!merged.some((m) => m.clientId === row.clientId)) {
      merged.push({ ...row, threadId: toThreadId });
    }
  }
  store[toKey] = merged;
  delete store[fromKey];
  writePendingUserMessagesStore(store);
}

export function loadPendingUserMessages(threadId: string | null): PendingUserMessage[] {
  return pendingUserMessagesStore()[pendingUserMessagesKey(threadId)] || [];
}

/** Re-attach sessionStorage orphans after Neo4j thread load. */
export function mergePendingUserMessagesIntoThread<T extends {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  pendingSend?: boolean;
  sendError?: string | null;
}>(messages: T[], threadId: string | null): T[] {
  const pending = loadPendingUserMessages(threadId);
  if (!pending.length) return messages;

  const userTexts = new Set(
    messages
      .filter((m) => m.sender === 'user')
      .map((m) => String(m.text || '').trim()),
  );

  const extras = pending
    .filter((row) => {
      const text = String(row.text || '').trim();
      if (!text) return false;
      return !userTexts.has(text);
    })
    .map((row) => ({
      id: row.clientId,
      text: row.text,
      sender: 'user' as const,
      timestamp: new Date(row.timestamp),
      pendingSend: true,
      sendError: row.sendError || null,
    } as T));

  return extras.length ? [...messages, ...extras] : messages;
}

export interface PendingContributionDraft {
  threadId: string | null;
  assistantMessageId?: string | null;
  draft: ContributionDraft;
  savedAt: string;
}

export function savePendingContributionDraft(
  draft: ContributionDraft,
  threadId: string | null,
  assistantMessageId?: string | null,
): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: PendingContributionDraft = {
      threadId,
      assistantMessageId: assistantMessageId || null,
      draft,
      savedAt: new Date().toISOString(),
    };
    sessionStorage.setItem(PENDING_DRAFT_KEY, JSON.stringify(payload));
    saveStagedProposal(draft);
  } catch {
    /* ignore quota errors */
  }
}

export function loadPendingContributionDraft(threadId: string | null): PendingContributionDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(PENDING_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingContributionDraft;
    if (!parsed?.draft) return null;
    if (threadId && parsed.threadId && parsed.threadId !== threadId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingContributionDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(PENDING_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

/** Most recent staged draft for a draftRef (e.g. ML-5), from localStorage backup. */
export function loadStagedProposalForRef(draftRef: string): ContributionDraft | null {
  const ref = String(draftRef || '').trim().toUpperCase();
  if (!ref) return null;
  for (const row of loadStagedProposals()) {
    if (String(row.draftRef || '').trim().toUpperCase() === ref) return row;
  }
  return null;
}

export function defaultDestination(): ContributionDestination {
  return 'canopi';
}

export function patchModeFromPayload(payload: Record<string, unknown>): PatchMode {
  return String(payload.patch_mode || 'replace').toLowerCase() === 'insert' ? 'insert' : 'replace';
}

export function proposalLabel(proposal: ContributionProposal): string {
  if (proposal.kind === 'comment') return 'Comment';
  return patchModeFromPayload(proposal.payload) === 'insert' ? 'Insert' : 'Patch';
}

export function discussLinkLabel(
  proposal: Pick<ContributionProposal, 'kind' | 'payload'>,
  kind: DiscussLinkKind,
): string {
  const action = kind === 'draft' ? 'Open draft' : 'View post';
  return `${action}: ${proposalLabel(proposal as ContributionProposal)}`;
}

export function proposalsFromContributionDraft(draft: ContributionDraft): ContributionProposal[] {
  if (draft.proposals?.length) return draft.proposals;
  return [{ id: 'p0', kind: draft.kind, payload: draft.payload }];
}

export function formatContributionUserSummary(
  draft: ContributionDraft,
  mode: ContributionSubmitMode,
  count: number,
): string {
  const action = mode === 'draft' ? 'Saved' : 'Published';
  const target = mode === 'draft' ? 'Discuss drafts' : 'Canopi Discuss';
  const noun = count === 1 ? 'proposal' : 'proposals';
  return `${action} ${count} ${noun} to ${target} · ${draft.draftRef}`;
}

export function formatContributionSubmissionMarkdown(
  draft: ContributionDraft,
  mode: ContributionSubmitMode,
  links: DiscussDeepLink[],
): string {
  const proposals = proposalsFromContributionDraft(draft);
  const actionLabel = mode === 'draft' ? 'saved as Discuss drafts' : 'published to Canopi Discuss';
  const lines: string[] = [
    `## Contribution ${actionLabel}`,
    '',
    `**${draft.title || 'Contribution'}**`,
  ];

  if (draft.summary?.trim()) {
    lines.push('', draft.summary.trim());
  }

  lines.push('', `**Target:** ${draft.draftRef}`, '');

  proposals.forEach((proposal, index) => {
    lines.push(`### ${index + 1}. ${proposalLabel(proposal)}`, '');
    if (proposal.kind === 'patch') {
      const anchor = String(
        proposal.payload.original_text || proposal.payload.anchor_passage || '',
      ).trim();
      const proposed = String(proposal.payload.proposed_text || '').trim();
      const rationale = String(proposal.payload.rationale || '').trim();
      const patchMode = patchModeFromPayload(proposal.payload);

      if (anchor) {
        lines.push('**Anchor passage**', '', anchor, '');
      }
      if (proposed) {
        lines.push(`**Proposed text** (${patchMode})`, '', proposed, '');
      }
      if (rationale) {
        lines.push('**Rationale**', '', rationale, '');
      }
    } else {
      const text = String(proposal.payload.text || '').trim();
      if (text) {
        lines.push('**Comment**', '', text, '');
      }
    }
  });

  if (links.length) {
    lines.push('### Links', '');
    for (const link of links) {
      lines.push(`- [${link.label}](${link.href})`);
    }
  }

  return lines.join('\n').trim();
}

export function loadStagedProposals(): ContributionDraft[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STAGED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ContributionDraft[]) : [];
  } catch {
    return [];
  }
}

export function saveStagedProposal(draft: ContributionDraft): void {
  if (typeof window === 'undefined') return;
  const existing = loadStagedProposals();
  const next = [
    {
      ...draft,
      title: draft.title || 'Staged proposals',
      savedAt: new Date().toISOString(),
    },
    ...existing,
  ].slice(0, 20);
  localStorage.setItem(STAGED_KEY, JSON.stringify(next));
}

export function removeStagedProposal(index: number): void {
  if (typeof window === 'undefined') return;
  const existing = loadStagedProposals();
  existing.splice(index, 1);
  localStorage.setItem(STAGED_KEY, JSON.stringify(existing));
}

/** Drop local staged backups after a successful submit for this ML ref. */
export function clearStagedProposalsForRef(draftRef: string): void {
  if (typeof window === 'undefined') return;
  const ref = String(draftRef || '').trim().toUpperCase();
  if (!ref) return;
  const next = loadStagedProposals().filter(
    (row) => String(row.draftRef || '').trim().toUpperCase() !== ref,
  );
  localStorage.setItem(STAGED_KEY, JSON.stringify(next));
}

/** True when the loaded thread already has a contribution record for this target. */
export function threadHasContributionRecord(
  messages: Array<{
    contributionRecord?: boolean;
    contributionHint?: MessageContributionHint | null;
  }>,
  draftRef?: string | null,
  mode?: ContributionSubmitMode | null,
): boolean {
  const ref = String(draftRef || '').trim().toUpperCase();
  return messages.some((m) => {
    if (!isContributionRecordHint(m.contributionHint) && !m.contributionRecord) return false;
    const hint = m.contributionHint;
    if (!isContributionRecordHint(hint)) return true;
    if (ref && String(hint.draftRef || '').trim().toUpperCase() !== ref) return false;
    if (mode && hint.mode !== mode) return false;
    return true;
  });
}

/** Ledger is source of truth — a source assistant turn with a complete set hides the CTA. */
export function sourceTurnHasFiledSet(
  sets: ContributionSet[],
  sourceTurnId: string | null | undefined,
): boolean {
  if (!sourceTurnId) return false;
  return sets.some(
    (s) => s.sourceTurnId === sourceTurnId
      && (s.status === 'complete' || s.status === 'partial'),
  );
}

/** Fingerprints already filed on this thread (for dedup when drafting). */
export function filedFingerprintsFromSets(sets: ContributionSet[]): Set<string> {
  const fps = new Set<string>();
  for (const set of sets) {
    if (set.status !== 'complete' && set.status !== 'partial') continue;
    for (const p of set.proposals || []) {
      if (p.fingerprint) fps.add(p.fingerprint);
    }
  }
  return fps;
}

async function sha256Hex16(input: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 16);
  }
  let h = 0;
  for (let i = 0; i < input.length; i += 1) h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  return Math.abs(h).toString(16).padStart(16, '0').slice(0, 16);
}

export async function proposalFingerprint(
  proposal: ContributionProposal,
  revisionOfMessageId?: string | null,
): Promise<string> {
  let content = '';
  if (proposal.kind === 'patch') {
    const p = proposal.payload;
    content = [
      String(p.original_text || p.anchor_passage || '').trim(),
      String(p.proposed_text || '').trim(),
      String(p.patch_mode || 'replace').toLowerCase(),
    ].join('|');
  } else {
    content = String(proposal.payload.text || '').trim();
  }
  if (revisionOfMessageId) {
    content = `${content}|rev:${String(revisionOfMessageId).trim()}`;
  }
  if (!content) return sha256Hex16(String(proposal.id || 'empty'));
  return sha256Hex16(content);
}

/** Parse contribution-record assistant markdown back into editable proposals. */
export function parseContributionRecordProposals(
  markdown: string,
): Array<{ kind: 'patch' | 'comment'; payload: Record<string, unknown> }> {
  const text = String(markdown || '');
  const sectionRe = /^###\s+\d+\.\s+(.+)$/gm;
  const matches = [...text.matchAll(sectionRe)];
  if (!matches.length) return [];

  const proposals: Array<{ kind: 'patch' | 'comment'; payload: Record<string, unknown> }> = [];

  for (let i = 0; i < matches.length; i += 1) {
    const start = (matches[i].index ?? 0) + matches[i][0].length;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length;
    const block = text.slice(start, end).trim();
    const label = String(matches[i][1] || '').trim().toLowerCase();
    const kind: 'patch' | 'comment' = label === 'comment' ? 'comment' : 'patch';

    const field = (name: string): string => {
      if (name === 'Proposed text') {
        const match = block.match(
          /\*\*Proposed text\*\*\s*(?:\([^)]+\))?\s*\n+([\s\S]*?)(?:\n\n\*\*|$)/i,
        );
        return match?.[1]?.trim() || '';
      }
      const re = new RegExp(`\\*\\*${name}\\*\\*\\s*\\n+([\\s\\S]*?)(?:\\n\\n\\*\\*|$)`, 'i');
      const match = block.match(re);
      return match?.[1]?.trim() || '';
    };

    if (kind === 'comment') {
      proposals.push({
        kind,
        payload: { text: field('Comment') },
      });
      continue;
    }

    const proposedHeader = block.match(/\*\*Proposed text\*\*\s*\(([^)]+)\)/i);
    const patchMode = proposedHeader?.[1]?.trim().toLowerCase() === 'insert' ? 'insert' : 'replace';
    proposals.push({
      kind: 'patch',
      payload: {
        original_text: field('Anchor passage'),
        proposed_text: field('Proposed text'),
        rationale: field('Rationale'),
        patch_mode: patchMode,
      },
    });
  }

  return proposals;
}

/** Build a revision draft pre-filled from a published ledger proposal + record markdown. */
export function buildRevisionDraftFromProposal(
  set: ContributionSet,
  proposal: LedgerProposal,
  recordMarkdown: string,
): ContributionDraft | null {
  if (!proposal.canopiMessageId) return null;

  const parsed = parseContributionRecordProposals(recordMarkdown);
  const proposalIndex = set.proposals.findIndex((p) => p.proposalId === proposal.proposalId);
  const parsedRow = proposalIndex >= 0 ? parsed[proposalIndex] : parsed[0];
  if (!parsedRow) return null;

  const titleMatch = recordMarkdown.match(/\*\*(.+?)\*\*/);
  const summaryMatch = recordMarkdown.match(/\*\*.+?\*\*\s*\n\n([\s\S]*?)\n\n\*\*Target:\*\*/);
  const proposalId = `rev-${proposal.proposalId}`;

  const contributionProposal: ContributionProposal = {
    id: proposalId,
    kind: parsedRow.kind,
    payload: {
      ...parsedRow.payload,
      supersedes_message_id: proposal.canopiMessageId,
    },
  };

  return {
    kind: parsedRow.kind,
    draftRef: set.draftRef,
    title: titleMatch?.[1]?.trim() || set.title || `Revision · ${proposal.label}`,
    summary: summaryMatch?.[1]?.trim()
      || `Revision of your published ${proposal.label.toLowerCase()} on ${set.draftRef}.`,
    payload: contributionProposal.payload,
    proposals: [contributionProposal],
    scope: 'message',
    destination: defaultDestination(),
    isRevision: true,
    supersedesMessageId: proposal.canopiMessageId,
    supersedesSetId: set.id,
    revisionOfProposalId: proposal.proposalId,
  };
}

function normalizeLedgerLabel(label: string): string {
  const lower = String(label || '').trim().toLowerCase();
  if (lower.includes('insert')) return 'Insert';
  if (lower.includes('patch')) return 'Patch';
  if (lower.includes('comment')) return 'Comment';
  return String(label || '').trim();
}

function proposalLabelsSignature(proposals: Array<{ kind: string; payload: Record<string, unknown> } | LedgerProposal>): string {
  const labels = proposals.map((p) => {
    if ('label' in p && p.label) return normalizeLedgerLabel(p.label);
    if ('kind' in p && p.kind === 'comment') return 'Comment';
    const mode = String(('payload' in p ? p.payload?.patch_mode : undefined) || 'replace').toLowerCase();
    return mode === 'insert' ? 'Insert' : 'Patch';
  });
  return labels.sort().join('|');
}

/**
 * Fallback when ledger fingerprints are link-id hashes (backfilled records) instead of content hashes.
 */
export function isDraftDuplicateOfLedgerByLabels(
  draft: ContributionDraft,
  sets: ContributionSet[],
  sourceTurnId?: string | null,
): boolean {
  const ref = String(draft.draftRef || '').trim().toUpperCase();
  if (!ref) return false;
  const draftProposals = proposalsFromContributionDraft(draft);
  const draftSig = proposalLabelsSignature(draftProposals);
  const candidates = sets.filter((s) => {
    if (String(s.draftRef || '').trim().toUpperCase() !== ref) return false;
    if (s.status !== 'complete' && s.status !== 'partial') return false;
    if (sourceTurnId && s.sourceTurnId !== sourceTurnId) return false;
    return true;
  });
  return candidates.some(
    (s) => proposalLabelsSignature(s.proposals || []) === draftSig
      && (s.proposals?.length || 0) === draftProposals.length,
  );
}

/** True when every proposal fingerprint in draft is already filed on the thread ledger. */
export async function isDraftFullyFiledInLedger(
  draft: ContributionDraft,
  sets: ContributionSet[],
  sourceTurnId?: string | null,
): Promise<boolean> {
  if (isDraftDuplicateOfLedgerByLabels(draft, sets, sourceTurnId)) return true;
  if (sourceTurnId && sourceTurnHasFiledSet(sets, sourceTurnId)) {
    const ref = String(draft.draftRef || '').trim().toUpperCase();
    if (ref && filedSetsForSourceTurn(sets, sourceTurnId).some(
      (s) => String(s.draftRef || '').trim().toUpperCase() === ref,
    )) {
      return true;
    }
  }

  const filed = filedFingerprintsFromSets(sets);
  if (!filed.size) return false;
  const proposals = proposalsFromContributionDraft(draft);
  for (const p of proposals) {
    const fp = await proposalFingerprint(p);
    if (!filed.has(fp)) return false;
  }
  return true;
}

/**
 * True when a locally cached draft must not reopen — ledger already has this batch.
 * Checks thread-level first (covers mismatched assistantMessageId on session restore).
 */
export async function shouldBlockDraftRestore(
  draft: ContributionDraft,
  sets: ContributionSet[],
  sourceTurnId?: string | null,
): Promise<boolean> {
  if (sourceTurnId && sourceTurnHasFiledSet(sets, sourceTurnId)) return true;
  if (isDraftDuplicateOfLedgerByLabels(draft, sets)) return true;
  if (sourceTurnId && isDraftDuplicateOfLedgerByLabels(draft, sets, sourceTurnId)) return true;
  if (await isDraftFullyFiledInLedger(draft, sets)) return true;
  if (sourceTurnId && await isDraftFullyFiledInLedger(draft, sets, sourceTurnId)) return true;
  return false;
}

/** Remove local staged backups when the thread ledger already has complete sets for those refs. */
export function clearStagedProposalsForFiledRefs(sets: ContributionSet[]): void {
  if (typeof window === 'undefined') return;
  const refs = new Set(
    sets
      .filter((s) => s.status === 'complete' || s.status === 'partial')
      .map((s) => String(s.draftRef || '').trim().toUpperCase())
      .filter(Boolean),
  );
  for (const ref of refs) clearStagedProposalsForRef(ref);
}

/** Drop session pending draft when it matches a filed ledger batch on this thread. */
export function clearPendingDraftIfFiledOnThread(
  sets: ContributionSet[],
  threadId: string | null,
): void {
  if (typeof window === 'undefined') return;
  const pending = loadPendingContributionDraft(threadId);
  if (!pending?.draft) return;
  const assistantTurnId = pending.assistantMessageId
    ? pending.assistantMessageId.replace(/-a$/, '')
    : null;
  if (sourceTurnHasFiledSet(sets, assistantTurnId)
    || isDraftDuplicateOfLedgerByLabels(pending.draft, sets)) {
    clearPendingContributionDraft();
  }
}

/** Build proposal status updates after Canopi submit. */
export async function buildProposalUpdates(
  proposals: ContributionProposal[],
  links: DiscussDeepLink[],
  mode: ContributionSubmitMode,
): Promise<Array<{
  proposalId: string;
  status: ProposalLedgerStatus;
  canopiMessageId?: string;
  canopiDraftId?: string;
  href?: string;
}>> {
  return Promise.all(proposals.map(async (proposal, index) => {
    const link = links.find((l) => l.id === proposal.id) || links[index];
    const status: ProposalLedgerStatus = mode === 'draft' ? 'draft' : 'published';
    return {
      proposalId: proposal.id,
      status,
      canopiMessageId: mode === 'publish' ? link?.id : undefined,
      canopiDraftId: mode === 'draft' ? link?.id : undefined,
      href: link?.href,
    };
  }));
}

export function buildContributionSetFromDraft(
  threadId: string,
  sourceTurnId: string | null | undefined,
  draft: ContributionDraft,
  mode: ContributionSubmitMode,
  proposalsWithFp: Array<ContributionProposal & { fingerprint: string }>,
  revisionMeta?: {
    supersedesMessageId?: string;
    supersedesSetId?: string;
    revisionOfProposalId?: string;
  },
): ContributionSet {
  const supersedesMessageId = revisionMeta?.supersedesMessageId || draft.supersedesMessageId;
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `set-${Date.now()}`,
    threadId,
    sourceTurnId: sourceTurnId || null,
    draftRef: draft.draftRef,
    mode,
    status: 'staged',
    createdAt: new Date().toISOString(),
    recordTurnId: null,
    title: draft.title || null,
    supersedesMessageId: supersedesMessageId || undefined,
    supersedesSetId: revisionMeta?.supersedesSetId || draft.supersedesSetId,
    revisionOfProposalId: revisionMeta?.revisionOfProposalId || draft.revisionOfProposalId,
    proposals: proposalsWithFp.map((p) => ({
      proposalId: p.id,
      kind: p.kind,
      label: proposalLabel(p),
      status: 'pending',
      fingerprint: p.fingerprint,
      revisionOf: supersedesMessageId || undefined,
    })),
  };
}

export function ledgerSetForRecord(
  sets: ContributionSet[],
  recordHint: ContributionRecordHint,
): ContributionSet | null {
  if (recordHint.setId) {
    const match = sets.find((s) => s.id === recordHint.setId);
    if (match) return match;
  }
  if (recordHint.sourceTurnId) {
    const match = sets.find(
      (s) => s.sourceTurnId === recordHint.sourceTurnId && s.mode === recordHint.mode,
    );
    if (match) return match;
  }
  return null;
}

export function proposalStatusBadge(status: ProposalLedgerStatus): string {
  switch (status) {
    case 'draft': return 'Draft';
    case 'published': return 'Published';
    case 'updated': return 'Updated';
    case 'withdrawn': return 'Withdrawn';
    default: return 'Pending';
  }
}

const PATCH_SIGNALS = [
  /\bsuggest an edit\b/i,
  /\bcanopi discuss\b/i,
  /\bproposed (?:addition|revision|text|patch|clause|sentence)\b/i,
  /\binsert as a new\b/i,
  /\boriginal[_ ]text\b/i,
  /\bproposed[_ ]text\b/i,
  /\bpatch_mode\b/i,
  /\bsuggested next steps\b/i,
  /\bpost as a\b/i,
  /\banchor(?:ing)?\s+(?:to|at)\s+section\b/i,
  /\bspecific revision to\b/i,
  /\bturn this into a (?:dp )?contribution\b/i,
  /\bsubmit (?:this|as)\b/i,
];

/** Client-side fallback when stored/API readiness is missing. */
export function inferContributionHint(
  userMessage: string,
  assistantReply: string,
  history: { text: string; sender: string }[] = [],
  dpFocus: number | null = null,
): ContributionHint | null {
  const userText = userMessage.trim();
  const assistantText = assistantReply.trim();
  if (!userText || !assistantText) return null;

  const haystack = `${userText}\n${assistantText}`;
  const hasSignal = PATCH_SIGNALS.some((re) => re.test(haystack));
  if (!hasSignal) return null;

  const threadSignals =
    /\b(full thread|several turns|across the conversation|synthesize)\b/i.test(haystack)
    || history.length >= 4;

  const dpMatch =
    assistantText.match(/\bDP(\d{1,2})\b/i)
    || userText.match(/\bDP(\d{1,2})\b/i);
  const dpNum = dpMatch ? Number(dpMatch[1]) : dpFocus;
  const draftRefHint = dpNum ? `ML-${dpNum}` : null;

  const suggestedKind: 'comment' | 'patch' =
    /\bproposed (?:addition|revision|text|clause|sentence)\b/i.test(assistantText)
    || /\binsert\b/i.test(assistantText)
    || /\breplace\b/i.test(assistantText)
    || /\brevision to\b/i.test(userText)
      ? 'patch'
      : 'comment';

  const recommendedScope = threadSignals ? 'ambiguous' : 'message';

  return {
    contributionReady: true,
    recommendedScope,
    reason: 'This exchange includes concrete edit language — ready to draft for Canopi Discuss.',
    suggestedKind,
    draftRefHint,
    defaultScope: recommendedScope === 'ambiguous' ? 'message' : recommendedScope,
  };
}
