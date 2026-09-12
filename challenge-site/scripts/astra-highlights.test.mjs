import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sampleJsonPath = path.resolve(
  __dirname,
  '../../astra/releases/2026-09-05-r1/dp01/chapter.json',
);
const sampleMdPath = path.resolve(
  __dirname,
  '../../astra/releases/2026-09-05-r1/dp01/chapter.md',
);
const integratedJsonPath = path.resolve(
  __dirname,
  '../../astra/releases/2026-09-05-integrated/dp01/chapter.json',
);
const integratedMdPath = path.resolve(
  __dirname,
  '../../astra/releases/2026-09-05-integrated/dp01/chapter.md',
);
const dp04JsonPath = path.resolve(
  __dirname,
  '../../astra/releases/2026-09-05-integrated/dp04/chapter.json',
);
const dp04MdPath = path.resolve(
  __dirname,
  '../../astra/releases/2026-09-05-integrated/dp04/chapter.md',
);

function compareRange(a, b) {
  return a.finalRange.start - b.finalRange.start || a.finalRange.end - b.finalRange.end;
}

const WORD_CHAR = /\w/;

function isMidWordBoundary(markdown, index) {
  if (index <= 0 || index >= markdown.length) return false;
  return WORD_CHAR.test(markdown[index - 1]) && WORD_CHAR.test(markdown[index]);
}

function expandRangeToWordBoundaries(markdown, start, end) {
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

function stripOrphanTrailingListMarker(text) {
  return String(text || '').replace(/\n\n\*$/, '\n\n');
}

function repairSplitBoldAcrossSegments(highlightText, plainText) {
  let highlight = highlightText;
  let plain = plainText;
  if (/\n\n\*$/.test(highlight) && plain.startsWith('*')) {
    highlight = stripOrphanTrailingListMarker(highlight);
    plain = `*${plain}`;
  } else {
    highlight = stripOrphanTrailingListMarker(highlight);
  }
  return { highlightText: highlight, plainText: plain };
}

function mergeTrailingArticleFromPlain(plainText, highlightText) {
  const plain = String(plainText || '');
  const highlight = String(highlightText || '');
  const match = plain.match(/(?:^|\n\n)([A-Z]) $/);
  if (!match || !/^[a-z]/.test(highlight)) return null;
  const article = `${match[1]} `;
  return {
    plainText: plain.slice(0, plain.length - article.length),
    highlightText: `${article}${highlight}`,
  };
}

function normalizeAstraHighlightSegments(segments) {
  const merged = [];
  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    if (segment.kind === 'plain') {
      const next = segments[i + 1];
      if (next?.kind === 'highlight') {
        const article = mergeTrailingArticleFromPlain(segment.text, next.text);
        if (article) {
          merged.push({ ...segment, text: article.plainText });
          merged.push({ ...next, text: article.highlightText });
          i += 1;
          continue;
        }
      }
    }
    merged.push(segment);
  }

  const out = [];
  for (let i = 0; i < merged.length; i += 1) {
    const segment = merged[i];
    if (segment.kind === 'highlight') {
      const next = merged[i + 1];
      if (next?.kind === 'plain') {
        const repaired = repairSplitBoldAcrossSegments(segment.text, next.text);
        out.push({ ...segment, text: repaired.highlightText });
        if (repaired.plainText !== next.text) {
          out.push({ ...next, text: repaired.plainText });
          i += 1;
        }
        continue;
      }
      out.push({ ...segment, text: stripOrphanTrailingListMarker(segment.text) });
      continue;
    }
    out.push(segment);
  }
  return out;
}

function buildAstraHighlightSegments(markdown, changes) {
  const sorted = [...changes].sort(compareRange);
  const segments = [];
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

  return normalizeAstraHighlightSegments(segments);
}

function validateAstraHighlights(markdown, changes) {
  const errors = [];
  const sorted = [...changes].sort(compareRange);

  for (const change of sorted) {
    const { start, end } = change.finalRange;
    if (start < 0 || end < 0 || start > end || end > markdown.length) {
      errors.push(`${change.id}: finalRange out of bounds (${start}-${end})`);
      continue;
    }

    if (change.operation === 'delete') {
      if (start !== end) errors.push(`${change.id}: delete finalRange must be zero-width`);
      if (!String(change.beforeText || '').trim()) {
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

function injectAstraMarkers(markdown, changes) {
  const START_MARKER = (id) => `{{ASTRA:${id}:START}}`;
  const END_MARKER = (id) => `{{ASTRA:${id}:END}}`;
  const DELETE_MARKER = (id) => `{{ASTRA:${id}:DELETE}}`;
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

test('sample DP1 chapter highlights validate', () => {
  const markdown = fs.readFileSync(sampleMdPath, 'utf8');
  const manifest = JSON.parse(fs.readFileSync(sampleJsonPath, 'utf8'));
  const errors = validateAstraHighlights(markdown, manifest.changes);
  assert.equal(errors.length, 0, errors.join('; '));

  const marked = injectAstraMarkers(markdown, manifest.changes);
  assert.match(marked, /\{\{ASTRA:astra:dp1:c0001:START\}\}/);
  assert.match(marked, /\{\{ASTRA:astra:dp1:c0003:DELETE\}\}/);
});

test('integrated DP1 inserts expand mid-word highlight boundaries', () => {
  const markdown = fs.readFileSync(integratedMdPath, 'utf8');
  const manifest = JSON.parse(fs.readFileSync(integratedJsonPath, 'utf8'));
  const segments = buildAstraHighlightSegments(markdown, manifest.changes);

  const auth = segments.find((segment) => segment.change?.id === 'dp01-change-001');
  assert.ok(auth && auth.kind === 'highlight');
  assert.match(auth.text, /^Authentication and public identification/);

  const bindings = segments.find((segment) => segment.change?.id === 'dp01-change-003');
  assert.ok(bindings && bindings.kind === 'highlight');
  assert.match(bindings.text, /^These bindings also apply/);

  for (const segment of segments) {
    if (segment.kind !== 'highlight') continue;
    if (/\n\n\*$/.test(segment.text)) {
      assert.fail(`highlight ${segment.change?.id} still ends with orphan list marker`);
    }
    const idx = markdown.indexOf(segment.text);
    assert.ok(idx >= 0, `highlight not found in markdown for ${segment.change?.id}`);
    if (idx > 0 && WORD_CHAR.test(markdown[idx - 1]) && WORD_CHAR.test(segment.text[0])) {
      assert.fail(`highlight ${segment.change?.id} still splits a leading word`);
    }
  }
});

test('integrated DP4 consent theater highlight does not orphan bullets or split A', () => {
  const markdown = fs.readFileSync(dp04MdPath, 'utf8');
  const manifest = JSON.parse(fs.readFileSync(dp04JsonPath, 'utf8'));
  const change = manifest.changes.find((row) => row.id === 'dp04-change-003');
  assert.ok(change);
  const segments = buildAstraHighlightSegments(markdown, [change]);

  const highlight = segments.find((segment) => segment.kind === 'highlight');
  assert.ok(highlight);
  assert.match(highlight.text, /^A person may agree/);
  assert.doesNotMatch(highlight.text, /\n\n\*$/);

  const followingPlain = segments[segments.indexOf(highlight) + 1];
  assert.ok(followingPlain && followingPlain.kind === 'plain');
  assert.match(followingPlain.text, /^\*\*Example:\*\*/);
});
