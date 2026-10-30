/**
 * Splitting one Review proposal into several with their own anchors: Deepi's marker for
 * recommending a split, and its drafted parts mapped onto the chapter's blocks.
 */
/** Deepi ends an answer with this line when it recommends a split; the Review tab then offers to draft one. */
export const SPLIT_MARK = '[offer-split]';

/**
 * Wording that recommends a split, for answers written before Deepi added SPLIT_MARK (and as a
 * fallback when it forgets): "works better as a separate proposal", "split this into two", etc.
 */
const SPLIT_WORDING =
  /\b(?:as (?:a )?separate proposals?|into (?:two|three|several|separate) (?:separate )?proposals|split (?:it|this|the proposal)\b|a (?:second|separate) proposal)/i;

/** The answer without the split marker, and whether it recommends a split (marker or wording). */
export function readSplitMark(answer: string | null): { answer: string | null; offersSplit: boolean } {
  if (!answer) return { answer, offersSplit: false };
  const marked = answer.includes(SPLIT_MARK);
  const text = marked ? answer.split(SPLIT_MARK).join('').trim() : answer;
  return { answer: text, offersSplit: marked || SPLIT_WORDING.test(text) };
}

export type SplitDraftPart = {
  /** Index of the chapter block (fetchChapterPassages) and its Markdown, which is the part's anchor. */
  passageIndex: number;
  passage: string;
  /** Filled in by the server (sectionTrail); null until then or when the block has no heading above it. */
  section: string | null;
  patchMode: 'replace' | 'insert' | 'insert_after';
  text: string;
  why: string;
};

export type SplitDraft = { parts: SplitDraftPart[]; note: string };

/** Claude's JSON as parts on real chapter blocks; parts pointing at a block that does not exist are dropped. */
export function splitDraftFrom(raw: unknown, passages: string[]): SplitDraft {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as { parts?: unknown; note?: unknown };
  const parts: SplitDraftPart[] = [];
  for (const p of Array.isArray(obj.parts) ? obj.parts.slice(0, 6) : []) {
    const part = (p || {}) as { block?: unknown; placement?: unknown; text?: unknown; why?: unknown };
    const index = Number(part.block);
    const text = String(part.text || '').trim();
    const mode = String(part.placement || '');
    if (!Number.isInteger(index) || index < 0 || index >= passages.length || !text) continue;
    if (mode !== 'insert' && mode !== 'insert_after' && mode !== 'replace') continue;
    parts.push({
      passageIndex: index,
      passage: passages[index],
      section: null,
      patchMode: mode,
      text,
      why: String(part.why || '').trim(),
    });
  }
  return { parts, note: String(obj.note || '').trim() };
}
