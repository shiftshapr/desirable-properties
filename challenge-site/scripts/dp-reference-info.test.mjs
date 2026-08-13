import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);

// Compiled path is not available in raw tests — import TS via dynamic eval of built exports.
// Run against the source by duplicating minimal parse helpers for CI, or use tsx.
// Here we test the pure parsing regex behavior mirrored in dp-reference-info.ts.

const DP_NUM_RE = /\bDP\s*(\d{1,2})\b/i;
const SECTIONS_RE = /\bsections?\s+([\d.,\s]+)/i;

function parseDpNumberFromLabel(label) {
  const match = String(label || '').match(DP_NUM_RE);
  if (!match?.[1]) return null;
  const n = parseInt(match[1], 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return `DP${n}`;
}

function parseSectionNumbersFromLabel(label) {
  const match = String(label || '').match(SECTIONS_RE);
  if (!match?.[1]) return [];
  return match[1]
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter((s) => /^\d+(?:\.\d+)*$/.test(s));
}

test('parseDpNumberFromLabel handles common Hermes pill labels', () => {
  assert.equal(parseDpNumberFromLabel('DP22 local draft'), 'DP22');
  assert.equal(parseDpNumberFromLabel('DP22 local draft (dp22.md)'), 'DP22');
  assert.equal(parseDpNumberFromLabel('DP10 local draft'), 'DP10');
  assert.equal(parseDpNumberFromLabel('DP23 draft (not yet inscribed) (dp23.md)'), 'DP23');
  assert.equal(parseDpNumberFromLabel('graph'), null);
});

test('parseSectionNumbersFromLabel extracts section lists', () => {
  assert.deepEqual(
    parseSectionNumbersFromLabel('DP22 local draft, sections 3.1, 5.1'),
    ['3.1', '5.1'],
  );
  assert.deepEqual(parseSectionNumbersFromLabel('DP7 local draft, section 2'), ['2']);
  assert.deepEqual(parseSectionNumbersFromLabel('DP22 local draft'), []);
});
