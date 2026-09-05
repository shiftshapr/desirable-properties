/** Shared sanitize helpers for import script and tests. */

export const ASTRA_BOOK_ORIGIN = 'https://book.desirableproperties.org';

export function stripAstraHtmlComments(markdown) {
  let out = String(markdown || '').replace(/<!--[\s\S]*?-->/g, '');
  out = out.replace(/\n{3,}/g, '\n\n');
  return out;
}

export function sanitizeAstraMarkdown(markdown) {
  return stripHeroHorizontalRule(stripAstraHtmlComments(markdown));
}

/** Remove thematic break immediately below the chapter hero illustration. */
export function stripHeroHorizontalRule(markdown) {
  return String(markdown || '').replace(/(!\[[^\]]*\]\([^)]+\))\n\n---\n\n/, '$1\n\n');
}

/** Estate typography: en dash in Astra output for DP2–DP22 (not editorial changes). */
export function normalizeAstraTypographyForChapter(markdown, chapterId) {
  const n = parseInt(String(chapterId || '').replace(/^DP/i, ''), 10);
  if (!Number.isFinite(n) || n < 2 || n > 22) {
    return String(markdown || '');
  }
  return String(markdown || '')
    .replace(/\u2014/g, '\u2013')
    .replace(/&mdash;/g, '\u2013')
    .replace(/&#8212;/g, '\u2013');
}

export function adjustRangesAfterCommentRemoval(originalMarkdown, ranges) {
  const removals = [];
  const commentPattern = /<!--[\s\S]*?-->/g;
  let match = commentPattern.exec(originalMarkdown);
  while (match) {
    removals.push({ start: match.index, end: match.index + match[0].length });
    match = commentPattern.exec(originalMarkdown);
  }

  function adjustPos(pos) {
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

export function adjustChangesAfterCommentRemoval(originalMarkdown, changes) {
  return changes.map((change) => {
    const [finalRange] = adjustRangesAfterCommentRemoval(originalMarkdown, [change.finalRange]);
    const next = { ...change, finalRange };
    if (change.originalRange) {
      const [originalRange] = adjustRangesAfterCommentRemoval(originalMarkdown, [change.originalRange]);
      next.originalRange = originalRange;
    }
    if (change.attachmentRange) {
      const [attachmentRange] = adjustRangesAfterCommentRemoval(originalMarkdown, [
        change.attachmentRange,
      ]);
      next.attachmentRange = attachmentRange;
    }
    return next;
  });
}
