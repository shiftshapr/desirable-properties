export type AstraProposalDispositionStatus =
  | 'integrated_reconciled'
  | 'integrated_revised'
  | 'not_integrated'
  | 'already_covered'
  | string;

export type AstraProposalDisposition = {
  source_ref?: string;
  kind?: string;
  id: string;
  patch_number?: number;
  original_chapter?: string;
  status: AstraProposalDispositionStatus;
  rationale?: string;
  changes?: Array<{ chapter?: string; change_id?: string }>;
};

export const ASTRA_EXCLUDED_DISPOSITION_STATUSES = new Set([
  'not_integrated',
  'already_covered',
]);

export const ASTRA_DISPOSITION_STATUS_LABELS: Record<string, string> = {
  not_integrated: 'Not integrated',
  already_covered: 'Already covered in chapter',
  integrated_reconciled: 'Integrated (reconciled)',
  integrated_revised: 'Integrated (revised)',
};

export function parseAstraDispositions(raw: unknown): AstraProposalDisposition[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (entry): entry is AstraProposalDisposition =>
      Boolean(entry && typeof entry === 'object' && typeof (entry as AstraProposalDisposition).id === 'string'),
  );
}

export function isExcludedAstraDisposition(entry: AstraProposalDisposition): boolean {
  return ASTRA_EXCLUDED_DISPOSITION_STATUSES.has(String(entry.status || '').trim());
}

export function excludedAstraDispositions(
  items: AstraProposalDisposition[],
): AstraProposalDisposition[] {
  return items.filter(isExcludedAstraDisposition);
}

export function groupDispositionsByChapter(
  items: AstraProposalDisposition[],
): Array<{ chapter: string; items: AstraProposalDisposition[] }> {
  const byChapter = new Map<string, AstraProposalDisposition[]>();
  for (const item of items) {
    const chapter = String(item.original_chapter || 'Unknown').trim() || 'Unknown';
    const list = byChapter.get(chapter) ?? [];
    list.push(item);
    byChapter.set(chapter, list);
  }
  return [...byChapter.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([chapter, chapterItems]) => ({ chapter, items: chapterItems }));
}

export function dispositionStatusLabel(status: string): string {
  return ASTRA_DISPOSITION_STATUS_LABELS[status] || status.replace(/_/g, ' ');
}
