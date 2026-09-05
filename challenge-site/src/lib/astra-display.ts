/**
 * Sanitize Astra chapter markdown for challenge-site display.
 * Strips sync HTML comments and rewrites book-local asset URLs.
 */

export const ASTRA_BOOK_ORIGIN = 'https://book.desirableproperties.org';

export function resolveAstraAssetUrl(src: string | undefined, bookOrigin = ASTRA_BOOK_ORIGIN): string {
  const value = String(src || '').trim();
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('/content/')) return `${bookOrigin}${value}`;
  return value;
}

/** Remove non-reader HTML comment metadata from book chapters. */
export function stripAstraHtmlComments(markdown: string): string {
  let out = String(markdown || '').replace(/<!--[\s\S]*?-->/g, '');
  out = out.replace(/\n{3,}/g, '\n\n');
  return out;
}

export function sanitizeAstraMarkdown(
  markdown: string,
  _bookOrigin = ASTRA_BOOK_ORIGIN,
): string {
  return stripAstraHtmlComments(markdown);
}

type TextRange = { start: number; end: number };

/** Shift UTF-16 highlight ranges after comment blocks are removed above them. */
export function adjustRangesAfterCommentRemoval(
  originalMarkdown: string,
  ranges: TextRange[],
): TextRange[] {
  const removals: Array<{ start: number; end: number }> = [];
  const commentPattern = /<!--[\s\S]*?-->/g;
  let match = commentPattern.exec(originalMarkdown);
  while (match) {
    removals.push({ start: match.index, end: match.index + match[0].length });
    match = commentPattern.exec(originalMarkdown);
  }

  function adjustPos(pos: number): number {
    let delta = 0;
    for (const removal of removals) {
      if (removal.end <= pos) {
        delta += removal.end - removal.start;
      }
    }
    return pos - delta;
  }

  return ranges.map((range) => ({
    start: adjustPos(range.start),
    end: adjustPos(range.end),
  }));
}

export function adjustChangesAfterCommentRemoval<
  T extends { finalRange: TextRange; originalRange?: TextRange; attachmentRange?: TextRange },
>(originalMarkdown: string, changes: T[]): T[] {
  return changes.map((change) => {
    const [finalRange] = adjustRangesAfterCommentRemoval(originalMarkdown, [change.finalRange]);
    const next = { ...change, finalRange };
    if (change.originalRange) {
      const [originalRange] = adjustRangesAfterCommentRemoval(originalMarkdown, [change.originalRange]);
      next.originalRange = originalRange;
    }
    if (change.attachmentRange) {
      const [attachmentRange] = adjustRangesAfterCommentRemoval(originalMarkdown, [change.attachmentRange]);
      next.attachmentRange = attachmentRange;
    }
    return next;
  });
}
