export type ReviewVote = 'yes' | 'no';

export type ReviewSource = 'govhub' | 'canopi';

export type ReviewEvalComment = {
  userId: string;
  userName: string;
  vote: ReviewVote;
  comment: string;
  updatedAt: string;
};

export type ReviewBundleEdit = {
  rule: string | null;
  originalText: string;
  proposedText: string;
};

/** Latest AI style-check result for an item (src/lib/style-check.server.ts). */
export type ReviewStyleCheck = {
  id: string;
  createdAt: string;
  model: string | null;
  helpful: boolean | null;
  verdict: 'ok' | 'suggestions';
  summary: string;
  notes: Array<{ section: string; issue: string; fix: string }>;
  suggestedText: string | null;
};

export type ReviewQueueItem = {
  key: string;
  sources: ReviewSource[];
  govhubProposalId: string | null;
  canopiMessageId: string | null;
  /** bundle = a mechanical style pass: many line edits approved together. */
  patchMode: 'replace' | 'insert' | 'bundle';
  edits: ReviewBundleEdit[];
  /** INSERT: where proposedText goes relative to originalText (the anchored passage). */
  insertPosition: 'above' | 'below' | null;
  /** replace: the passage being replaced. insert: the anchored passage it goes next to. */
  originalText: string;
  proposedText: string;
  rationale: string | null;
  authorName: string;
  createdAt: string;
  status: string;
  anchorHash: string | null;
  conflictSetId: string;
  conflictCount: number;
  hrefs: { book: string | null; govhub: string | null };
  evals: {
    yes: number;
    no: number;
    mine: ReviewVote | null;
    comments: ReviewEvalComment[];
  };
  /** Pending patch/insert that can be style-checked. */
  styleCheckable: boolean;
  styleCheck: ReviewStyleCheck | null;
  canPromote: boolean;
  promoteBlockReason: string | null;
};

export type ReviewWorkingRevision = {
  exists: boolean;
  revisionNumber: string | null;
  appliedCount: number;
  unpublished: boolean;
  canPublish: boolean;
  publishBlockReason: string | null;
};

export type ReviewQueueResponse = {
  items: ReviewQueueItem[];
  conflictSets: number;
  draftRef: string | null;
  workingRevision: ReviewWorkingRevision;
  isMember: boolean;
  canEdit: boolean;
  /** False when no model is configured on this server. */
  styleCheckEnabled: boolean;
};
