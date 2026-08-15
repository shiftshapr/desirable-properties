export type ContributionScope = 'message' | 'thread';

export type ContributionDestination = 'canopi' | 'govhub';

export type PatchMode = 'replace' | 'insert';

export interface ContributionHint {
  contributionReady: boolean;
  recommendedScope?: ContributionScope | 'ambiguous';
  reason?: string;
  suggestedKind?: 'comment' | 'patch' | null;
  draftRefHint?: string | null;
  defaultScope?: ContributionScope;
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
