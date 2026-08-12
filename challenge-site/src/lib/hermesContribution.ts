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
  if (draft.recommendedDestination === 'canopi') return 'canopi';
  return 'govhub';
}

export function patchModeFromPayload(payload: Record<string, unknown>): PatchMode {
  return String(payload.patch_mode || 'replace').toLowerCase() === 'insert' ? 'insert' : 'replace';
}
