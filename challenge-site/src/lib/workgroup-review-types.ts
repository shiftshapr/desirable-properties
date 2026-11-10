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
  /** Style pass: rule codes. Dedup: the finding this edit belongs to. */
  rule: string | null;
  originalText: string;
  /** Empty in a dedup bundle: delete originalText. */
  proposedText: string;
  /** Dedup only: why this edit. */
  note: string | null;
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

/** Claude found a better anchor for this proposal (src/lib/anchor-eval.server.ts). */
export type ReviewAnchorEval = {
  reason: string;
  confidence: string | null;
  /** The chapter block (Markdown) Claude suggests; Revise sends it as the new anchor. */
  suggestedPassage: string;
  suggestedMode: 'insert' | 'insert_after';
  evaluatedAt: string;
  model: string | null;
};

export type ReviewQueueItem = {
  key: string;
  sources: ReviewSource[];
  govhubProposalId: string | null;
  canopiMessageId: string | null;
  /** bundle = a mechanical style pass; dedup = duplicate-text deletions and merges. Both are many
   *  edits approved together; a dedup bundle applies all or nothing. */
  patchMode: 'replace' | 'insert' | 'bundle' | 'dedup';
  edits: ReviewBundleEdit[];
  /** INSERT: where proposedText goes relative to originalText (the anchored passage). */
  insertPosition: 'above' | 'below' | null;
  /** A Canopi insert filed as a replace (anchor + new text): just the new text. patchMode stays
   *  'replace' and proposedText keeps the full replacement, which is what approving applies. */
  insertText: string | null;
  /** replace: the passage being replaced. insert: the anchored passage it goes next to. */
  originalText: string;
  /** The headings above the anchored passage, e.g. "5. Runtime › 5.14 Risk-Tiered Enforcement";
   *  null when the passage is not in the current chapter text. */
  section: string | null;
  proposedText: string;
  rationale: string | null;
  authorName: string;
  /** Gov Hub user id of the author (null for Canopi-only items); the author may withdraw while pending. */
  authorGovhubUserId: string | null;
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
  /** Co-editor approvals recorded in Gov Hub; userId is the Gov Hub user id. */
  approvals: Array<{ userId: string; userName: string; note: string | null; createdAt: string | null }>;
  /** Changes the chapter title: every co-editor approves AND a steering committee member agrees. */
  titleChange?: boolean;
  /** A steering committee member (not the author) has agreed to this title change. */
  steeringSignoff?: boolean;
  /** Set when a co-editor revised another proposal into this one (text and/or placement). */
  revisedBy: string | null;
  /** Decline / considered note and who wrote it, once decided. */
  decision: { by: string | null; note: string | null } | null;
  /** Pending patch/insert that can be style-checked. */
  styleCheckable: boolean;
  styleCheck: ReviewStyleCheck | null;
  /** Plain-words reason the last automatic style check failed, while there is no good result. */
  styleCheckError: string | null;
  /** Set only while the evaluated anchor and text are unchanged and no co-editor kept the anchor. */
  anchorEval: ReviewAnchorEval | null;
  canPromote: boolean;
  promoteBlockReason: string | null;
  /** After the editorial freeze, for steering members: the analysis's recommendation and the steering votes. */
  steering?: ReviewSteeringInfo | null;
};

/** One proposal's steering-sweep record, as the Review tab shows it (Gov Hub steering API). */
export type ReviewSteeringInfo = {
  recommendation: string | null;
  confidence: string | null;
  stale: boolean;
  /** none | one | split | ready | done */
  state: string;
  votes: Array<{ voterName: string; decision: string; mine: boolean }>;
  outcomeError: string | null;
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
  /** Viewer may decide proposals now: a co-editor, or a steering member after the editorial freeze. */
  isCoEditor: boolean;
  /** Viewer's Gov Hub user id, to match approvals. */
  viewerGovhubUserId: string | null;
  /** Signed in here, but Gov Hub no longer accepts the sign-in (usually an expired token): sign in again. */
  signInStale: boolean;
  /** False when no model is configured on this server. */
  styleCheckEnabled: boolean;
  /** Ask Deepi (Claude) is configured on this server; also requires the pre-publish check. */
  askEnabled: boolean;
  /** Approvals a proposal needs: every co-editor seat (two on most DPs, three on DP4); one after the freeze. */
  approvalsNeeded: number;
  /** The V1.0 editorial freeze has started: only the steering committee decides and publishes. */
  editorialFreeze?: boolean;
  /** Viewer is on the steering committee. */
  isSteering?: boolean;
  /** Viewer may agree to title changes (steering committee, or a site admin until it is named). */
  canSignoffTitles?: boolean;
  /** After the freeze, for steering members: this document's steering sweep page (/steering/<ml>). */
  steeringHref?: string | null;
  /** Set when the steering record could not be loaded (the buttons still record votes). */
  steeringError?: string | null;
};
