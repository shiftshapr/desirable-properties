import type { AstraChange, AstraHighlightSegment } from '@/lib/astra-types';

const START_MARKER = (id: string) => `{{ASTRA:${id}:START}}`;
const END_MARKER = (id: string) => `{{ASTRA:${id}:END}}`;
const DELETE_MARKER = (id: string) => `{{ASTRA:${id}:DELETE}}`;

export const ASTRA_MARKER_PATTERN = /\{\{ASTRA:([^:}]+):(START|END|DELETE)\}\}/g;

function compareRange(a: AstraChange, b: AstraChange): number {
  return a.finalRange.start - b.finalRange.start || a.finalRange.end - b.finalRange.end;
}

export function validateAstraHighlights(markdown: string, changes: AstraChange[]): string[] {
  const errors: string[] = [];
  const sorted = [...changes].sort(compareRange);

  for (const change of sorted) {
    const { start, end } = change.finalRange;
    if (start < 0 || end < 0 || start > end || end > markdown.length) {
      errors.push(`${change.id}: finalRange out of bounds (${start}-${end})`);
      continue;
    }

    if (change.operation === 'delete') {
      if (start !== end) {
        errors.push(`${change.id}: delete finalRange must be zero-width`);
      }
      if (!change.beforeText.trim()) {
        errors.push(`${change.id}: delete requires beforeText`);
      }
      continue;
    }

    const { start: displayStart, end: displayEnd } = expandRangeToWordBoundaries(
      markdown,
      start,
      end,
    );
    const slice = markdown.slice(displayStart, displayEnd);
    if (slice !== change.afterText) {
      errors.push(`${change.id}: finalRange text mismatch`);
    }
  }

  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (curr.finalRange.start < prev.finalRange.end) {
      errors.push(`${prev.id} overlaps ${curr.id}`);
    }
  }

  return errors;
}

const WORD_CHAR = /\w/;

/** True when `index` sits inside a word (both neighbors are word chars). */
function isMidWordBoundary(markdown: string, index: number): boolean {
  if (index <= 0 || index >= markdown.length) return false;
  return WORD_CHAR.test(markdown[index - 1]) && WORD_CHAR.test(markdown[index]);
}

/** Expand highlight span so display never splits a word across plain vs highlight. */
export function expandRangeToWordBoundaries(
  markdown: string,
  start: number,
  end: number,
): { start: number; end: number } {
  let expandedStart = start;
  let expandedEnd = end;

  while (expandedStart > 0 && isMidWordBoundary(markdown, expandedStart)) {
    expandedStart -= 1;
  }
  while (expandedEnd < markdown.length && isMidWordBoundary(markdown, expandedEnd)) {
    expandedEnd += 1;
  }

  return { start: expandedStart, end: expandedEnd };
}

/** Resolve BEFORE/AFTER copy for change detail panels (word-boundary safe). */
export function resolveChangeDisplayTexts(
  markdown: string,
  change: AstraChange,
): { beforeText: string; afterText: string } {
  const beforeText = change.beforeText || '';
  if (change.operation === 'delete') {
    return { beforeText, afterText: '' };
  }

  const { start, end } = expandRangeToWordBoundaries(
    markdown,
    change.finalRange.start,
    change.finalRange.end,
  );
  if (end > start) {
    return { beforeText, afterText: markdown.slice(start, end) };
  }
  return { beforeText, afterText: change.afterText || '' };
}

export type AstraRenderGroup =
  | { kind: 'markdown'; segments: AstraHighlightSegment[] }
  | { kind: 'deletion'; change: AstraChange };

/** True when markdown fragment should render as its own block (headings, lists, blank-line breaks). */
export function isBlockLevelMarkdownFragment(text: string): boolean {
  const trimmed = text.trimStart();
  if (!trimmed) return false;
  if (trimmed.startsWith('#')) return true;
  if (text.includes('\n\n')) return true;
  if (/^[-*+]\s/m.test(text)) return true;
  if (/^\d+\.\s/m.test(text)) return true;
  if (trimmed.startsWith('>')) return true;
  return false;
}

export function buildAstraHighlightSegments(
  markdown: string,
  changes: AstraChange[],
): AstraHighlightSegment[] {
  const sorted = [...changes].sort(compareRange);
  const segments: AstraHighlightSegment[] = [];
  let cursor = 0;

  for (const change of sorted) {
    const { start: rawStart, end: rawEnd } = change.finalRange;
    const { start, end } =
      change.operation === 'delete'
        ? { start: rawStart, end: rawEnd }
        : expandRangeToWordBoundaries(markdown, rawStart, rawEnd);

    if (start > cursor) {
      segments.push({ kind: 'plain', text: markdown.slice(cursor, start) });
    }

    if (change.operation === 'delete') {
      segments.push({ kind: 'deletion-marker', text: '', change });
    } else if (end > start) {
      segments.push({
        kind: 'highlight',
        text: markdown.slice(start, end),
        change,
      });
    }

    cursor = Math.max(cursor, end);
  }

  if (cursor < markdown.length) {
    segments.push({ kind: 'plain', text: markdown.slice(cursor) });
  }

  return segments;
}

/** Group adjacent inline plain/highlight segments so one paragraph is not split across blocks. */
export function groupAstraSegmentsForRender(segments: AstraHighlightSegment[]): AstraRenderGroup[] {
  const groups: AstraRenderGroup[] = [];
  let inlineRun: AstraHighlightSegment[] = [];

  const flushInlineRun = () => {
    if (!inlineRun.length) return;
    if (inlineRun.length === 1) {
      groups.push({ kind: 'markdown', segments: [inlineRun[0]] });
    } else {
      groups.push({ kind: 'markdown', segments: [...inlineRun] });
    }
    inlineRun = [];
  };

  for (const segment of segments) {
    if (segment.kind === 'deletion-marker') {
      flushInlineRun();
      if (segment.change) {
        groups.push({ kind: 'deletion', change: segment.change });
      }
      continue;
    }

    const blockLevel = isBlockLevelMarkdownFragment(segment.text);
    if (blockLevel) {
      flushInlineRun();
      groups.push({ kind: 'markdown', segments: [segment] });
      continue;
    }

    if (inlineRun.length > 0) {
      inlineRun.push(segment);
      continue;
    }

    inlineRun.push(segment);
  }

  flushInlineRun();
  return groups;
}

/** Inject ASCII markers at highlight boundaries so markdown can render as one document. */
export function injectAstraMarkers(markdown: string, changes: AstraChange[]): string {
  const sorted = [...changes].sort((a, b) => b.finalRange.start - a.finalRange.start);
  let out = markdown;

  for (const change of sorted) {
    const { start, end } = change.finalRange;
    if (change.operation === 'delete') {
      out = `${out.slice(0, start)}${DELETE_MARKER(change.id)}${out.slice(start)}`;
      continue;
    }
    if (end <= start) continue;
    const inner = out.slice(start, end);
    out = `${out.slice(0, start)}${START_MARKER(change.id)}${inner}${END_MARKER(change.id)}${out.slice(end)}`;
  }

  return out;
}

export function findAstraChangeById(changes: AstraChange[], changeId: string): AstraChange | null {
  const needle = String(changeId || '').trim();
  if (!needle) return null;
  return changes.find((change) => change.id === needle) || null;
}

export function findAstraChangesByProposalId(
  changes: AstraChange[],
  proposalId: string,
): AstraChange[] {
  const needle = String(proposalId || '').trim().toLowerCase();
  if (!needle) return [];
  return changes.filter((change) =>
    change.sources.some((source) => source.id.toLowerCase() === needle),
  );
}

export function markerMetaFromMatch(match: RegExpExecArray): {
  changeId: string;
  kind: 'START' | 'END' | 'DELETE';
} {
  return {
    changeId: match[1],
    kind: match[2] as 'START' | 'END' | 'DELETE',
  };
}
