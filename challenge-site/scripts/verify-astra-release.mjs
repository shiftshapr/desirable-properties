#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const challengeRoot = path.resolve(__dirname, '..');
const releaseId = process.env.ASTRA_RELEASE_ID?.trim() || '2026-09-05-r1';
const releaseDir = path.resolve(challengeRoot, '..', 'astra', 'releases', releaseId);

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

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

function validateHighlights(markdown, changes) {
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

function replayChanges(baseline, changes) {
  const sorted = [...changes].sort((a, b) => {
    const aPos = a.originalRange?.start ?? a.finalRange.start;
    const bPos = b.originalRange?.start ?? b.finalRange.start;
    return bPos - aPos;
  });

  let out = baseline;
  for (const change of sorted) {
    if (change.operation === 'delete') {
      const range = change.originalRange;
      if (!range) continue;
      out = out.slice(0, range.start) + out.slice(range.end);
      continue;
    }
    if (change.operation === 'insert') {
      const pos = change.originalRange?.start ?? change.finalRange.start;
      out = out.slice(0, pos) + change.afterText + out.slice(pos);
      continue;
    }
    const range = change.originalRange;
    if (!range) continue;
    out = out.slice(0, range.start) + change.afterText + out.slice(range.end);
  }
  return out;
}

function loadBaseline(releaseDirPath, dpKey, baselineSha256) {
  const baselinePath = path.join(releaseDirPath, dpKey, 'baseline.md');
  if (!fs.existsSync(baselinePath)) {
    return { baseline: null, skipped: true };
  }
  const baseline = fs.readFileSync(baselinePath, 'utf8');
  const hash = sha256(baseline);
  if (hash !== baselineSha256) {
    throw new Error(`${dpKey}: baseline hash mismatch (expected ${baselineSha256}, got ${hash})`);
  }
  return { baseline, skipped: false };
}

function verifyChapter(releaseDirPath, dpKey) {
  const mdPath = path.join(releaseDirPath, dpKey, 'chapter.md');
  const jsonPath = path.join(releaseDirPath, dpKey, 'chapter.json');
  if (!fs.existsSync(mdPath) || !fs.existsSync(jsonPath)) {
    return [`${dpKey}: missing chapter.md or chapter.json`];
  }

  const markdown = fs.readFileSync(mdPath, 'utf8');
  const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const errors = validateHighlights(markdown, manifest.changes || []);

  const finalHash = sha256(markdown);
  if (manifest.finalSha256 && manifest.finalSha256 !== finalHash) {
    errors.push(`${dpKey}: finalSha256 mismatch`);
  }

  const baselineResult = loadBaseline(releaseDirPath, dpKey, manifest.baselineSha256);
  if (!baselineResult.skipped && baselineResult.baseline) {
    const replayed = replayChanges(baselineResult.baseline, manifest.changes || []);
    if (replayed !== markdown) {
      errors.push(`${dpKey}: replay against baseline.md does not match chapter.md`);
    }
  }

  return errors;
}

function main() {
  if (!fs.existsSync(releaseDir)) {
    console.error(`Release not found: ${releaseDir}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(path.join(releaseDir, 'manifest.json'), 'utf8'));
  const available = manifest.chapters.filter((entry) => entry.status === 'available');
  const allErrors = [];

  for (const entry of available) {
    allErrors.push(...verifyChapter(releaseDir, entry.dpKey));
  }

  if (allErrors.length) {
    console.error(`Astra release ${releaseId} verification failed:`);
    for (const error of allErrors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(`Astra release ${releaseId} verified (${available.length} chapter(s)).`);
}

main();
