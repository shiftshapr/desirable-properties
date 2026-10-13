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

export type ReviewQueueItem = {
  key: string;
  sources: ReviewSource[];
  govhubProposalId: string | null;
  canopiMessageId: string | null;
  /** bundle = a mechanical style pass: many line edits approved together. */
  patchMode: 'replace' | 'insert' | 'bundle';
  edits: ReviewBundleEdit[];
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
};
