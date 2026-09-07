import type { ChapterPatchMode } from '@/lib/workgroup-chapter-patch';
import { applyPatchToMarkdown, summarizePatch } from '@/lib/workgroup-chapter-patch';

export type WorkgroupChapterEditStatus = 'pending' | 'active' | 'rejected' | 'revoked';

export type WorkgroupChapterEdit = {
  id: string;
  workgroupId: string;
  dpKey: string;
  astraReleaseId: string;
  /** Legacy full-chapter snapshot (pre-patch model). */
  markdown: string | null;
  baseMarkdown: string | null;
  patchMode: ChapterPatchMode | null;
  originalText: string | null;
  proposedText: string | null;
  anchorHash: string | null;
  rationale: string | null;
  authorUserId: string;
  authorName: string;
  status: WorkgroupChapterEditStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  revokedBy: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export type WorkgroupChapterEditList = {
  edits: WorkgroupChapterEdit[];
  effectiveMarkdown: string;
  baseMarkdown: string;
  hasMemberEdits: boolean;
  pendingCount: number;
};

export function isLegacyFullChapterEdit(edit: WorkgroupChapterEdit): boolean {
  return !edit.patchMode && Boolean(edit.markdown?.trim());
}

export function summarizeMarkdownEdit(before: string, after: string): string {
  const charDelta = after.length - before.length;
  const lineDelta = after.split('\n').length - before.split('\n').length;
  const charLabel = charDelta === 0 ? 'no character change' : `${charDelta > 0 ? '+' : ''}${charDelta} characters`;
  const lineLabel =
    lineDelta === 0 ? 'lines unchanged' : `${lineDelta > 0 ? '+' : ''}${lineDelta} lines`;
  return `${charLabel}, ${lineLabel}`;
}

export function getLatestActiveChapterEdit(
  edits: WorkgroupChapterEdit[],
): WorkgroupChapterEdit | null {
  const active = edits
    .filter((edit) => edit.status === 'active')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return active.length ? active[active.length - 1]! : null;
}

export function countActiveChapterEdits(edits: WorkgroupChapterEdit[]): number {
  return edits.filter((edit) => edit.status === 'active').length;
}

export function countPendingChapterEdits(edits: WorkgroupChapterEdit[]): number {
  return edits.filter((edit) => edit.status === 'pending').length;
}

export function chapterEditStatusLabel(status: WorkgroupChapterEditStatus): string {
  switch (status) {
    case 'pending':
      return 'Awaiting approval';
    case 'active':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'revoked':
      return 'Revoked';
    default:
      return status;
  }
}

export function patchModeLabel(mode: ChapterPatchMode | null | undefined): string {
  if (mode === 'insert') return 'Insert';
  if (mode === 'replace') return 'Patch';
  return 'Chapter';
}

export function previewEditOnMarkdown(
  baseMarkdown: string,
  edit: WorkgroupChapterEdit,
): string | null {
  if (isLegacyFullChapterEdit(edit)) return edit.markdown;
  if (!edit.patchMode || !edit.originalText || !edit.proposedText) return null;
  return applyPatchToMarkdown(baseMarkdown, {
    patchMode: edit.patchMode,
    originalText: edit.originalText,
    proposedText: edit.proposedText,
  });
}

export function editSummaryText(edit: WorkgroupChapterEdit, baseMarkdown: string): string {
  if (isLegacyFullChapterEdit(edit) && edit.markdown) {
    return summarizeMarkdownEdit(baseMarkdown, edit.markdown);
  }
  if (edit.patchMode && edit.originalText && edit.proposedText) {
    return summarizePatch({
      patchMode: edit.patchMode,
      originalText: edit.originalText,
      proposedText: edit.proposedText,
    });
  }
  return 'Passage edit';
}
