/** Word-level inline diff – mirrors Gov Hub `text_diff.py` / `proposal-display.js`. */

export const MAX_DIFF_TOKENS = 4000;

export type DiffOp = { type: 'equal' | 'del' | 'ins'; text: string };

export type MarkdownSection = {
  heading: string;
  content: string;
};

export type SectionDiff = {
  heading: string;
  changed: boolean;
  ops: DiffOp[];
};

const TOKEN_RE = /\S+|\s+/g;

export function tokenizeWords(text: string): string[] {
  return String(text ?? '').match(TOKEN_RE) ?? [];
}

function tokenCount(text: string): number {
  return tokenizeWords(text).length;
}

/** Split chapter markdown at ## headings (preamble uses empty heading). */
export function splitMarkdownSections(markdown: string): MarkdownSection[] {
  const parts = String(markdown ?? '').split(/(?=^## )/m);
  return parts.map((part) => {
    if (part.startsWith('## ')) {
      const nl = part.indexOf('\n');
      if (nl === -1) return { heading: part.trim(), content: '' };
      return {
        heading: part.slice(0, nl).trim(),
        content: part.slice(nl + 1),
      };
    }
    return { heading: '', content: part };
  });
}

function sectionKey(section: MarkdownSection): string {
  return section.heading || '__preamble__';
}

function pairSections(
  originalSections: MarkdownSection[],
  proposedSections: MarkdownSection[],
): Array<{ original: MarkdownSection; proposed: MarkdownSection }> {
  const proposedByKey = new Map(proposedSections.map((s) => [sectionKey(s), s]));
  const pairs: Array<{ original: MarkdownSection; proposed: MarkdownSection }> = [];

  for (const original of originalSections) {
    const key = sectionKey(original);
    const proposed = proposedByKey.get(key) ?? { heading: original.heading, content: '' };
    proposedByKey.delete(key);
    pairs.push({ original, proposed });
  }

  for (const proposed of proposedByKey.values()) {
    pairs.push({ original: { heading: proposed.heading, content: '' }, proposed });
  }

  return pairs;
}

/** LCS word diff (same algorithm as Gov Hub `diffWords`). */
export function diffWords(original: string, proposed: string): DiffOp[] {
  const a = tokenizeWords(original);
  const b = tokenizeWords(proposed);
  const n = a.length;
  const m = b.length;

  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const ops: DiffOp[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      ops.unshift({ type: 'equal', text: a[i - 1] });
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.unshift({ type: 'ins', text: b[j - 1] });
      j -= 1;
    } else {
      ops.unshift({ type: 'del', text: a[i - 1] });
      i -= 1;
    }
  }
  return ops;
}

/** Line-level diff fallback for large sections. */
export function diffLines(original: string, proposed: string): DiffOp[] {
  const a = String(original ?? '').split('\n');
  const b = String(proposed ?? '').split('\n');
  const n = a.length;
  const m = b.length;

  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const segments: Array<{ type: DiffOp['type']; line: string }> = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      segments.unshift({ type: 'equal', line: a[i - 1] });
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      segments.unshift({ type: 'ins', line: b[j - 1] });
      j -= 1;
    } else {
      segments.unshift({ type: 'del', line: a[i - 1] });
      i -= 1;
    }
  }

  return segments.map((segment, idx) => ({
    type: segment.type,
    text: segment.line + (idx < segments.length - 1 ? '\n' : ''),
  }));
}

export function isDiffOverTokenCap(original: string, proposed: string): boolean {
  return tokenCount(original) > MAX_DIFF_TOKENS || tokenCount(proposed) > MAX_DIFF_TOKENS;
}

function diffSectionContent(original: string, proposed: string): DiffOp[] {
  if (original === proposed) return [{ type: 'equal', text: original }];
  if (!isDiffOverTokenCap(original, proposed)) {
    return diffWords(original, proposed);
  }
  return diffLines(original, proposed);
}

function opsHaveChanges(ops: DiffOp[]): boolean {
  return ops.some((op) => op.type !== 'equal');
}

function countOpsChanges(ops: DiffOp[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  let i = 0;
  while (i < ops.length) {
    if (ops[i].type === 'del') {
      const del = chunkLength(ops, i, 'del');
      removed += del.len;
      i = del.end;
      if (i < ops.length && ops[i].type === 'ins') {
        const ins = chunkLength(ops, i, 'ins');
        added += ins.len;
        i = ins.end;
      }
    } else if (ops[i].type === 'ins') {
      const ins = chunkLength(ops, i, 'ins');
      added += ins.len;
      i = ins.end;
    } else {
      i += 1;
    }
  }
  return { added, removed };
}

/** Section-aware diff for full Astra chapters (avoids whole-chapter token cap). */
export function buildMarkdownSectionDiffs(
  original: string,
  proposed: string,
): { sections: SectionDiff[]; added: number; removed: number } {
  const pairs = pairSections(splitMarkdownSections(original), splitMarkdownSections(proposed));
  const sections: SectionDiff[] = [];
  let added = 0;
  let removed = 0;

  for (const { original: origSection, proposed: propSection } of pairs) {
    const heading = propSection.heading || origSection.heading;
    const ops = diffSectionContent(origSection.content, propSection.content);
    const changed = origSection.content !== propSection.content || opsHaveChanges(ops);
    const counts = countOpsChanges(ops);
    added += counts.added;
    removed += counts.removed;
    sections.push({ heading, changed, ops });
  }

  return { sections, added, removed };
}

function chunkLength(ops: DiffOp[], start: number, type: 'del' | 'ins'): { len: number; end: number } {
  let chunk = '';
  let end = start;
  while (end < ops.length && ops[end].type === type) {
    chunk += ops[end].text;
    end += 1;
  }
  return { len: chunk.trim().length, end };
}

/** Character counts for legend (+N / −N), matching `text_diff.change_counts`. */
export function changeCounts(
  original: string,
  proposed: string,
): { added: number; removed: number } {
  if (isDiffOverTokenCap(original, proposed)) {
    return buildMarkdownSectionDiffs(original, proposed);
  }
  const ops = diffWords(original, proposed);
  let added = 0;
  let removed = 0;
  let i = 0;
  while (i < ops.length) {
    if (ops[i].type === 'del') {
      const del = chunkLength(ops, i, 'del');
      removed += del.len;
      i = del.end;
      if (i < ops.length && ops[i].type === 'ins') {
        const ins = chunkLength(ops, i, 'ins');
        added += ins.len;
        i = ins.end;
      }
    } else if (ops[i].type === 'ins') {
      const ins = chunkLength(ops, i, 'ins');
      added += ins.len;
      i = ins.end;
    } else {
      i += 1;
    }
  }
  return { added, removed };
}

export function buildDiffOps(original: string, proposed: string): DiffOp[] {
  if (isDiffOverTokenCap(original, proposed)) {
    return [{ type: 'equal', text: proposed ?? '' }];
  }
  return diffWords(original, proposed);
}

/** Build inline diff markup as HTML string (for tests / parity with Gov Hub). */
export function buildDiffHtml(original: string, proposed: string): string {
  const ops = buildDiffOps(original, proposed);
  let html = '';
  for (const op of ops) {
    const chunk = escapeHtml(op.text);
    if (op.type === 'equal') html += chunk;
    else if (op.type === 'del') html += `<del class="dp-diff-del">${chunk}</del>`;
    else if (op.type === 'ins') html += `<mark class="dp-diff-ins">${chunk}</mark>`;
  }
  return html;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
