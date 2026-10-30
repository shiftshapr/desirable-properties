/**
 * Where a passage sits in a DP chapter: the headings above it ("5. Runtime › 5.14 Risk-Tiered
 * Enforcement"), from Gov Hub's chapter Markdown blocks (fetchChapterPassages).
 */

/** A Markdown block as plain text for matching (markers, links and spacing removed, lowercased). */
export function plainBlock(block: string): string {
  return String(block || '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*-{3,}\s*$/gm, '')
    .replace(/\*\*|__|[*_`]/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function headingOf(block: string): { level: number; text: string } | null {
  const m = /^(#{1,6})\s+(.+)$/.exec(block.trim().split('\n')[0] || '');
  return m ? { level: m[1].length, text: plainBlock(m[2]) } : null;
}

/** Index of the first block the passage starts in, or -1. The passage may span several blocks. */
export function findPassageIndex(passages: string[], passage: string): number {
  const exact = passages.indexOf(passage);
  if (exact >= 0) return exact;
  const lines = String(passage || '')
    .split(/\n\s*\n/)
    .map(plainBlock)
    .filter(Boolean);
  const first = (lines[0] || '').toLowerCase();
  if (!first) return -1;
  const probe = first.slice(0, 160);
  const plain = passages.map((p) => plainBlock(p).toLowerCase());
  const inside = plain.findIndex((p) => p.includes(probe));
  if (inside >= 0) return inside;
  // A passage that starts mid-block on one line and runs on: match the start of the passage's first line.
  return plain.findIndex((p) => probe.length > 40 && p.includes(probe.slice(0, 40)));
}

/**
 * The headings that hold block `index`, outermost first (the block's own heading counts when the
 * block is one). Top-level chapter titles (#) are left out: every passage is in the chapter.
 */
export function sectionTrail(passages: string[], index: number): string[] {
  if (index < 0 || index >= passages.length) return [];
  const trail: Array<{ level: number; text: string }> = [];
  let ceiling = 7;
  for (let i = index; i >= 0 && ceiling > 2; i--) {
    const h = headingOf(passages[i]);
    if (!h || h.level >= ceiling) continue;
    if (h.level >= 2) trail.unshift(h);
    ceiling = h.level;
  }
  return trail.map((h) => h.text);
}

/** "5. Runtime › 5.14 Risk-Tiered Enforcement" for a passage, or null when it cannot be placed. */
export function sectionLabelFor(passages: string[], passage: string): string | null {
  const trail = sectionTrail(passages, findPassageIndex(passages, passage));
  return trail.length ? trail.join(' › ') : null;
}
