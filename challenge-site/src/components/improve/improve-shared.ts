/** Shared types and helpers for /improve (explorer + DP drawer). */

export type SeatSummary = {
  total: number;
  filled: number;
  open: number;
  /** Gov Hub reports the editorial freeze as still on (seat claims may be paused). */
  freeze: boolean;
};

export type ImproveDp = {
  id: string;
  number: number;
  title: string;
  summary: string;
  keywords: string;
  workgroupId: string | null;
  workgroupSlug: string | null;
  workgroupHref: string | null;
  coEditorsHref: string | null;
  nominateHref: string | null;
  discussHref: string;
  bookHref: string;
  patchHref: string;
  dpPageHref: string;
  /** Public seat counts (anonymous view, cached 5 min); null when Gov Hub did not answer. */
  seats: SeatSummary | null;
};

/** The subset of /api/steering/proposals rows the page uses. */
export type ImproveProposal = {
  id: string;
  docKey: string;
  mlNumber: string;
  status: string;
  statusLabel: string;
  author: string;
  coEditor: string | null;
  createdAt: string | null;
  source: 'community' | 'academy' | 'repair' | 'agent';
  revised: boolean;
  rationale: string;
  section: string | null;
  originalText: string;
  proposedText: string;
  reviewNote: string | null;
};

export type IndexedProposal = ImproveProposal & { hay: string; summaryLine: string };

export const SOURCE_LABEL: Record<ImproveProposal['source'], string> = {
  community: 'Community',
  academy: 'Metaweb Academy',
  repair: 'Steering repair',
  agent: 'Agent-assisted',
};

export const STATUS_LABEL: Record<string, string> = {
  pending: 'Open',
  accepted: 'Merged',
  incorporated: 'Published in revision',
  considered: 'Considered',
  declined: 'Declined',
  withdrawn: 'Withdrawn',
  orphaned: 'Original text not found',
};

export const STATUS_TONE: Record<string, string> = {
  accepted: 'border-emerald-700/70 text-emerald-200',
  incorporated: 'border-emerald-700/70 text-emerald-200',
  considered: 'border-cyan-700/70 text-cyan-200',
  declined: 'border-rose-800/70 text-rose-200',
  withdrawn: 'border-slate-700 text-slate-400',
  orphaned: 'border-slate-700 text-slate-400',
  pending: 'border-amber-600/80 text-amber-200',
};

export function statusLabel(p: Pick<ImproveProposal, 'status' | 'statusLabel'>): string {
  return STATUS_LABEL[p.status] || p.statusLabel || p.status;
}

export function indexProposal(p: ImproveProposal): IndexedProposal {
  const firstLine = (p.rationale || p.proposedText || '').split('\n').find((l) => l.trim()) || '';
  return {
    ...p,
    summaryLine: firstLine.trim(),
    hay: [p.docKey, p.author, p.coEditor, p.section, p.rationale, p.reviewNote, p.originalText, p.proposedText, SOURCE_LABEL[p.source], statusLabel(p)]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
  };
}

export function searchWords(q: string): string[] {
  return q.toLowerCase().split(/\s+/).filter(Boolean);
}

export function matchesWords(hay: string, words: string[]): boolean {
  return words.every((w) => hay.includes(w));
}

export function shortDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
