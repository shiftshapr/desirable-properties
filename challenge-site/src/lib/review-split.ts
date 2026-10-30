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

/** Deepi ends an answer with this line when it suggests a different place or wording for the one proposal. */
export const REVISE_MARK = '[offer-revise]';

/** Wording that suggests a new place or a rewrite, for answers written before REVISE_MARK. */
const REVISE_WORDING =
  /\b(?:a better (?:spot|place|placement|home|anchor) (?:is|would be)|the anchor is (?:wrong|awkward)|the (?:best|better) (?:fit|placement) is|suggested (?:version|wording|rewrite)|move (?:it|this|the (?:insert|text|proposal)) to|(?:insert|put|place) (?:it )?(?:after|before|below|above) \[\d+\])/i;

/**
 * The answer without the markers, and what it recommends: a split (marker or wording), or else a
 * revision of this proposal in a different place or wording. A split covers the revision.
 */
export function readSplitMark(answer: string | null): { answer: string | null; offersSplit: boolean; offersRevise: boolean } {
  if (!answer) return { answer, offersSplit: false, offersRevise: false };
  const text = [SPLIT_MARK, REVISE_MARK].some((m) => answer.includes(m))
    ? answer.split(SPLIT_MARK).join('').split(REVISE_MARK).join('').trim()
    : answer;
  const offersSplit = answer.includes(SPLIT_MARK) || SPLIT_WORDING.test(text);
  const offersRevise = !offersSplit && (answer.includes(REVISE_MARK) || REVISE_WORDING.test(text));
  return { answer: text, offersSplit, offersRevise };
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
