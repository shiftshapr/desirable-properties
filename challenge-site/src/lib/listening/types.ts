/**
 * Listening workspace (Phase 1): shared types and constants for the meeting record.
 * Design: ~/handoff/specs/listening-workspace-phase1-design.md. Spec: dp-listening-sessions-workspace-FULL.md.
 * Client-safe: no server imports here.
 */

export const CARD_TYPES = [
  'discussion_topic',
  'summary_point',
  'proposed_option',
  'supporting_reason',
  'objection',
  'clarifying_question',
  'suggested_amendment',
  'unresolved_issue',
  'confirmed_outcome',
  'follow_up_action',
] as const;
export type CardType = (typeof CARD_TYPES)[number];

export const CARD_TYPE_LABEL: Record<CardType, string> = {
  discussion_topic: 'Discussion topic',
  summary_point: 'Summary point',
  proposed_option: 'Proposed option',
  supporting_reason: 'Supporting reason',
  objection: 'Objection or concern',
  clarifying_question: 'Clarifying question',
  suggested_amendment: 'Suggested amendment',
  unresolved_issue: 'Unresolved issue',
  confirmed_outcome: 'Confirmed outcome',
  follow_up_action: 'Follow-up action',
};

/** Spec §5 labels, plus "Proposal added after the meeting" for items with no transcript source by nature. */
export const CARD_LABELS = [
  'participant_proposal',
  'claude_synthesis',
  'disputed_interpretation',
  'facilitator_confirmed',
  'council_decision',
  'added_after_meeting',
] as const;
export type CardLabel = (typeof CARD_LABELS)[number];

export const CARD_LABEL_TEXT: Record<CardLabel, string> = {
  participant_proposal: 'Participant proposal',
  claude_synthesis: 'Claude synthesis',
  disputed_interpretation: 'Disputed interpretation',
  facilitator_confirmed: 'Facilitator-confirmed meeting outcome (not automatically binding)',
  council_decision: 'Council decision',
  added_after_meeting: 'Proposal added after the meeting',
};

/** Labels that mark a card as a suggestion: allowed without a source (spec §15 Phase 1 acceptance). */
export const UNSOURCED_OK_LABELS: readonly CardLabel[] = ['claude_synthesis', 'added_after_meeting'];

export const CONTRIBUTION_KINDS = ['comment', 'question', 'suggested_option', 'correction_request'] as const;
export type ContributionKind = (typeof CONTRIBUTION_KINDS)[number];

export const CONTRIBUTION_KIND_TEXT: Record<ContributionKind, string> = {
  comment: 'Comment',
  question: 'Question for Claude',
  suggested_option: 'Suggested option',
  correction_request: 'Correction request',
};

export const TARGET_TYPES = ['meeting', 'topic', 'card', 'segment'] as const;
export type TargetType = (typeof TARGET_TYPES)[number];

/** Spec §4 "After": the phases one page moves through. */
export const PHASES = [
  'before',
  'live',
  'preparing_draft',
  'verification_open',
  'verification_closed',
  'council_screening',
  'ready_for_voting',
  'voting_open',
  'decision_recorded',
  'implementation',
] as const;
export type Phase = (typeof PHASES)[number];

export const PHASE_TEXT: Record<Phase, string> = {
  before: 'Before the meeting',
  live: 'Meeting in progress',
  preparing_draft: 'Preparing the draft',
  verification_open: 'Community verification open',
  verification_closed: 'Community verification closed',
  council_screening: 'Council screening',
  ready_for_voting: 'Ready for voting',
  voting_open: 'Voting open',
  decision_recorded: 'Decision recorded',
  implementation: 'Implementation and follow-up',
};

export const ROLES = ['participant', 'facilitator', 'administrator', 'council', 'claude_service'] as const;
export type Role = (typeof ROLES)[number];
/** Reserved in Phase 1: no account can hold them yet. */
export const RESERVED_ROLES: readonly Role[] = ['council', 'claude_service'];

export const MODERATION_ACTIONS = [
  'prioritize',
  'deprioritize',
  'defer',
  'undefer',
  'combine',
  'correction_accepted',
  'correction_not_accepted',
] as const;
export type ModerationAction = (typeof MODERATION_ACTIONS)[number];

/**
 * Spec §16: decisions the community has not taken. Shown as settings, never coded as values.
 * Each stays "not yet adopted" until a recorded decision says otherwise.
 */
export const GOVERNANCE_SETTINGS: readonly { key: string; label: string }[] = [
  { key: 'attendance', label: 'Who can attend, read the transcript and contribute' },
  { key: 'anonymous', label: 'Anonymous contributions' },
  { key: 'council', label: 'Council remit, membership and screening threshold' },
  { key: 'eligibility', label: 'Voting eligibility' },
  { key: 'quorum', label: 'Quorum' },
  { key: 'thresholds', label: 'Voting method and approval thresholds' },
  { key: 'changes', label: 'Handling substantial changes during verification' },
  { key: 'retention', label: 'Transcript retention and public access' },
  { key: 'scope', label: 'Desirable Properties only, or Meta-Layer and Overweb' },
  { key: 'budget', label: 'Budget and limits for live processing' },
];

export const LIMITS = {
  body: 4000,
  title: 300,
  reason: 500,
} as const;

export type SourceRef = { type: 'segment'; id: string } | { type: 'contribution'; id: string };

export type Speaker = {
  id: string;
  zoomDisplayName: string;
  attributionStatus: 'unresolved' | 'confirmed';
};

export type SegmentRev = {
  rev: number;
  text: string;
  kind: 'original' | 'correction';
  correctionId: string | null;
  actorName: string | null;
  createdAt: string;
};

export type Segment = {
  id: string;
  sourceId: string;
  speakerId: string | null;
  startMs: number;
  endMs: number | null;
  section: string | null;
  currentRev: number;
  revs: SegmentRev[];
};

export type CardRev = {
  rev: number;
  title: string;
  body: string;
  label: CardLabel | null;
  sourceRefs: SourceRef[];
  status: 'active' | 'withdrawn';
  reason: string | null;
  actorName: string | null;
  actorRole: string | null;
  createdAt: string;
};

export type Card = {
  id: string;
  parentId: string | null;
  cardType: CardType;
  origin: 'import' | 'participant' | 'facilitator' | 'claude';
  sortOrder: number;
  currentRev: number;
  createdAt: string;
  revs: CardRev[];
};

export type Contribution = {
  id: string;
  authorUserId: string;
  authorName: string;
  kind: ContributionKind;
  targetType: TargetType;
  targetId: string | null;
  body: string;
  proposedText: string | null;
  timing: 'before' | 'live' | 'after';
  createdAt: string;
};

export type Moderation = {
  id: string;
  contributionId: string;
  action: ModerationAction;
  relatedId: string | null;
  note: string | null;
  actorName: string | null;
  createdAt: string;
};

export type PhaseChange = {
  seq: number;
  from: Phase | null;
  to: Phase;
  note: string | null;
  actorName: string | null;
  actorRole: string | null;
  createdAt: string;
};

export type Meeting = {
  id: string;
  slug: string;
  title: string;
  kind: 'occurrence' | 'demo';
  startsAt: string | null;
  endsAt: string | null;
  canonicalPath: string | null;
  joinUrl: string | null;
  phase: Phase;
  transcriptMode: 'none' | 'imported' | 'replaying' | 'live';
  transcriptSource: string | null;
};

export type Viewer = {
  userId: string | null;
  name: string | null;
  role: Role | null;
  signedIn: boolean;
};

export type Snapshot = {
  meeting: Meeting;
  cursor: number;
  speakers: Speaker[];
  segments: Segment[];
  cards: Card[];
  contributions: Contribution[];
  moderation: Moderation[];
  phaseHistory: PhaseChange[];
  viewer: Viewer;
};

/** One stream event (the SSE `data`). `seq` is also the SSE id. */
export type WorkspaceEvent =
  | { seq: number; kind: 'speaker.added'; speaker: Speaker }
  | { seq: number; kind: 'segment.added'; segment: Segment }
  | { seq: number; kind: 'segment.revised'; segmentId: string; rev: SegmentRev }
  | { seq: number; kind: 'card.created'; card: Card }
  | { seq: number; kind: 'card.revised'; cardId: string; rev: CardRev }
  | { seq: number; kind: 'contribution.added'; contribution: Contribution }
  | { seq: number; kind: 'moderation.added'; moderation: Moderation }
  | { seq: number; kind: 'phase.changed'; change: PhaseChange }
  | { seq: number; kind: 'meeting.updated'; meeting: Partial<Meeting> }
  | { seq: number; kind: 'participant.role'; userId: string; name: string | null; role: Role };

export function currentCardRev(card: Card): CardRev {
  return card.revs.find((r) => r.rev === card.currentRev) ?? card.revs[card.revs.length - 1];
}

export function currentSegmentRev(seg: Segment): SegmentRev {
  return seg.revs.find((r) => r.rev === seg.currentRev) ?? seg.revs[seg.revs.length - 1];
}

/** "01:17:26" from milliseconds on the meeting timeline. */
export function clockFromMs(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

/** True when a card revision meets the Phase 1 rule: a source, or a suggestion label. */
export function cardRevIsGrounded(rev: Pick<CardRev, 'sourceRefs' | 'label'>): boolean {
  if (rev.sourceRefs.length > 0) return true;
  return rev.label !== null && UNSOURCED_OK_LABELS.includes(rev.label);
}
