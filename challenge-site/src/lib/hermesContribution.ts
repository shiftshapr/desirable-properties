export type ContributionScope = 'message' | 'thread';

export type ContributionDestination = 'govhub' | 'canopi';

export type PatchMode = 'replace' | 'insert';

export interface ContributionHint {
  contributionReady: boolean;
  recommendedScope?: ContributionScope | 'ambiguous';
  reason?: string;
  suggestedKind?: 'comment' | 'patch' | null;
  draftRefHint?: string | null;
  defaultScope?: ContributionScope;
}

export interface ContributionDraft {
  kind: 'comment' | 'patch';
  draftRef: string;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
  scope?: ContributionScope;
  /** Where Hermes suggests filing first. */
  recommendedDestination?: ContributionDestination | 'either';
  /** User-selected submit target (defaults from recommendedDestination). */
  destination?: ContributionDestination;
}

export function defaultDestination(
  draft: Pick<ContributionDraft, 'recommendedDestination' | 'destination'>,
): ContributionDestination {
  if (draft.destination) return draft.destination;
  if (draft.recommendedDestination === 'govhub') return 'govhub';
  return 'canopi';
}

export function patchModeFromPayload(payload: Record<string, unknown>): PatchMode {
  return String(payload.patch_mode || 'replace').toLowerCase() === 'insert' ? 'insert' : 'replace';
}

const PATCH_SIGNALS = [
  /\bsuggest an edit\b/i,
  /\bgov hub\b/i,
  /\bcanopi discuss\b/i,
  /\bpatch:\b/i,
  /\binsert:\b/i,
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
