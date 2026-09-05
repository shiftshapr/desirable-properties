#!/usr/bin/env node
/**
 * Replace em dashes with en dashes in Astra integrated corpus (DP2–DP22).
 * Bakes typography into chapter.md + chapter.json so it is not an editorial change.
 *
 * Usage:
 *   node scripts/normalize-astra-em-dashes.mjs [--release 2026-09-05-integrated]
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { normalizeAstraTypographyForChapter } from './astra-markdown-sanitize.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const challengeRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(challengeRoot, '..');

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function replaceInJsonStrings(obj, chapterId) {
  if (typeof obj === 'string') {
    return normalizeAstraTypographyForChapter(obj, chapterId);
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => replaceInJsonStrings(item, chapterId));
  }
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, replaceInJsonStrings(value, chapterId)]),
    );
  }
  return obj;
}

function main() {
  const releaseArg = process.argv.find((arg, i) => process.argv[i - 1] === '--release');
  const releaseId = releaseArg || process.env.ASTRA_RELEASE_ID || '2026-09-05-integrated';
  const releaseDir = path.join(repoRoot, 'astra', 'releases', releaseId);

  if (!fs.existsSync(releaseDir)) {
    console.error(`Release not found: ${releaseDir}`);
    process.exit(1);
  }

  let total = 0;
  for (let i = 2; i <= 22; i += 1) {
    const dpKey = `dp${String(i).padStart(2, '0')}`;
    const chapterId = `DP${i}`;
    const mdPath = path.join(releaseDir, dpKey, 'chapter.md');
    const jsonPath = path.join(releaseDir, dpKey, 'chapter.json');
    if (!fs.existsSync(mdPath) || !fs.existsSync(jsonPath)) continue;

    const before = fs.readFileSync(mdPath, 'utf8');
    const emCount = (before.match(/\u2014/g) || []).length;
    if (!emCount) continue;

    const markdown = normalizeAstraTypographyForChapter(before, chapterId);
    fs.writeFileSync(mdPath, markdown);

    const manifest = replaceInJsonStrings(
      JSON.parse(fs.readFileSync(jsonPath, 'utf8')),
      chapterId,
    );
    manifest.finalSha256 = sha256(markdown);
    fs.writeFileSync(jsonPath, `${JSON.stringify(manifest, null, 2)}\n`);

    total += emCount;
    console.log(`${dpKey}: replaced ${emCount} em dash(es)`);
  }

  console.log(`Done. ${total} em dash(es) normalized in ${releaseId} (DP2–DP22).`);
}

main();
