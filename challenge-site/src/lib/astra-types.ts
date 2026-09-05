export type AstraChangeOperation = 'replace' | 'insert' | 'delete' | 'relocate' | 'revise';

export type AstraSourceType = 'cfi' | 'govhub' | 'canopi' | 'astra';

export type AstraTextRange = {
  start: number;
  end: number;
};

export type AstraChangeSource = {
  type: AstraSourceType;
  id: string;
  label: string;
  url?: string;
};

export type AstraChange = {
  id: string;
  operation: AstraChangeOperation;
  beforeText: string;
  afterText: string;
  finalRange: AstraTextRange;
  originalRange?: AstraTextRange;
  attachmentRange?: AstraTextRange;
  contextAnchor?: string;
  sources: AstraChangeSource[];
  attribution: string[];
  rationale: string;
};

export type AstraOmittedProposal = {
  sourceId: string;
  sourceType?: AstraSourceType;
  label?: string;
  reason: string;
};

export type AstraChapterManifest = {
  chapterId: string;
  releaseId: string;
  baselineMlDraft: string;
  baselineSha256: string;
  finalSha256: string;
  verified?: boolean;
  changes: AstraChange[];
  omitted: AstraOmittedProposal[];
};

export type AstraChapterIndexEntry = {
  chapterId: string;
  dpKey: string;
  status: 'available' | 'pending';
  baselineMlDraft: string;
  changeCount: number;
  omittedCount: number;
};

export type AstraReleaseManifest = {
  releaseId: string;
  publishedAt: string;
  description?: string;
  verified?: boolean;
  chapters: AstraChapterIndexEntry[];
};

export type AstraChapterBundle = {
  markdown: string;
  manifest: AstraChapterManifest;
};

export type AstraHighlightSegment = {
  kind: 'plain' | 'highlight' | 'deletion-marker';
  text: string;
  change?: AstraChange;
};

export const ASTRA_DWELL_MS = 450;

export const ASTRA_OPERATION_LABELS: Record<AstraChangeOperation, string> = {
  replace: 'Replacement',
  insert: 'Insertion',
  delete: 'Deletion',
  relocate: 'Relocation',
  revise: 'Editorial revision',
};

export const ASTRA_OPERATION_STYLES: Record<AstraChangeOperation, string> = {
  replace: 'bg-amber-500/20 border-b-2 border-amber-400/70',
  insert: 'bg-emerald-500/20 border-b-2 border-emerald-400/70',
  delete: 'bg-rose-500/20 border-b-2 border-rose-400/70 border-dashed',
  relocate: 'bg-violet-500/20 border-b-2 border-violet-400/70',
  revise: 'bg-cyan-500/20 border-b-2 border-cyan-400/70',
};
