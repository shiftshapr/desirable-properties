import { createHash } from 'crypto';

export type ChapterPatchMode = 'replace' | 'insert';

export type ChapterPatchInput = {
  patchMode: ChapterPatchMode;
  originalText: string;
  proposedText: string;
};

/** Normalize passage text for matching (Gov Hub-style). */
export function normalizePatchText(text: string): string {
  return String(text ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

/** Apply replace or insert-before-anchor to markdown body. Returns null if anchor missing. */
export function applyPatchToMarkdown(
  body: string,
  patch: ChapterPatchInput,
): string | null {
  const haystack = body || '';
  const needle = normalizePatchText(patch.originalText);
  const insertion = normalizePatchText(patch.proposedText);
  if (!needle || !insertion) return null;

  const idx = haystack.indexOf(needle);
  if (idx < 0) return null;

  if (patch.patchMode === 'insert') {
    return haystack.slice(0, idx) + insertion + haystack.slice(idx);
  }

  return haystack.slice(0, idx) + insertion + haystack.slice(idx + needle.length);
}

export function passageExistsInMarkdown(haystack: string, passage: string): boolean {
  const needle = normalizePatchText(passage);
  if (!needle) return false;
  return (haystack || '').indexOf(needle) >= 0;
}

export function anchorHashFromPassage(passage: string): string {
  const normalized = normalizePatchText(passage).replace(/\s+/g, ' ');
  return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

export function summarizePatch(patch: ChapterPatchInput): string {
  const mode = patch.patchMode === 'insert' ? 'Insert above' : 'Replace';
  const origLen = normalizePatchText(patch.originalText).length;
  const propLen = normalizePatchText(patch.proposedText).length;
  return `${mode} · anchor ${origLen} chars → ${propLen} chars proposed`;
}
