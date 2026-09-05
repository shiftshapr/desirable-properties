#!/usr/bin/env node
/**
 * Remove the horizontal rule below each chapter hero image in the Astra corpus.
 * Adjusts change ranges and afterText in chapter.json accordingly.
 *
 * Usage:
 *   node scripts/strip-astra-hero-hr.mjs [--release 2026-09-05-integrated]
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { stripHeroHorizontalRule } from './astra-markdown-sanitize.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const challengeRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(challengeRoot, '..');

const HERO_HR_RE = /(!\[[^\]]*\]\([^)]+\))\n\n---\n\n/;
const HERO_HR_DELTA = 5; // removes "---\n\n" after image block

const WORD_CHAR = /\w/;

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

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

function shiftRange(range, hrEndBefore) {
  if (!range || range.start < hrEndBefore) return range;
  return {
    start: range.start - HERO_HR_DELTA,
    end: range.end - HERO_HR_DELTA,
  };
}

function refreshAfterText(markdown, change) {
  if (change.operation === 'delete') return change;
  const { start, end } = change.finalRange;
  if (end <= start) return change;
  const { start: displayStart, end: displayEnd } = expandRangeToWordBoundaries(
    markdown,
    start,
    end,
  );
  return { ...change, afterText: markdown.slice(displayStart, displayEnd) };
}

function processChapter(releaseDir, dpKey) {
  const mdPath = path.join(releaseDir, dpKey, 'chapter.md');
  const jsonPath = path.join(releaseDir, dpKey, 'chapter.json');
  if (!fs.existsSync(mdPath) || !fs.existsSync(jsonPath)) return false;

  const before = fs.readFileSync(mdPath, 'utf8');
  const match = before.match(HERO_HR_RE);
  if (!match) return false;

  const hrEndBefore = match.index + match[0].length;
  const markdown = stripHeroHorizontalRule(before);
  const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  manifest.changes = (manifest.changes || []).map((change) => {
    const next = {
      ...change,
      finalRange: shiftRange(change.finalRange, hrEndBefore),
      originalRange: shiftRange(change.originalRange, hrEndBefore),
      attachmentRange: shiftRange(change.attachmentRange, hrEndBefore),
    };
    return refreshAfterText(markdown, next);
  });

  manifest.finalSha256 = sha256(markdown);
  fs.writeFileSync(mdPath, markdown);
  fs.writeFileSync(jsonPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return true;
}

function main() {
  const releaseArg = process.argv.find((arg, i) => process.argv[i - 1] === '--release');
  const releaseId = releaseArg || process.env.ASTRA_RELEASE_ID || '2026-09-05-integrated';
  const releaseDir = path.join(repoRoot, 'astra', 'releases', releaseId);

  if (!fs.existsSync(releaseDir)) {
    console.error(`Release not found: ${releaseDir}`);
    process.exit(1);
  }

  let count = 0;
  for (let i = 1; i <= 23; i += 1) {
    const dpKey = `dp${String(i).padStart(2, '0')}`;
    if (processChapter(releaseDir, dpKey)) {
      count += 1;
      console.log(`${dpKey}: removed hero HR`);
    }
  }

  console.log(`Done. Updated ${count} chapter(s) in ${releaseId}.`);
}

main();
