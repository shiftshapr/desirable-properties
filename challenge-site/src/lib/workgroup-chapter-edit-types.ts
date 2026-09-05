export type WorkgroupChapterEditStatus = 'active' | 'revoked';

export type WorkgroupChapterEdit = {
  id: string;
  workgroupId: string;
  dpKey: string;
  astraReleaseId: string;
  markdown: string;
  rationale: string | null;
  authorUserId: string;
  authorName: string;
  status: WorkgroupChapterEditStatus;
  revokedBy: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export type WorkgroupChapterEditList = {
  edits: WorkgroupChapterEdit[];
  effectiveMarkdown: string;
  baseMarkdown: string;
  hasMemberEdits: boolean;
};

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
