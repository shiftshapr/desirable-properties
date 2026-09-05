#!/usr/bin/env node
/**
 * Import Astra integrated-book zip layout into challenge-site corpus format.
 *
 * Usage:
 *   node scripts/import-astra-release.mjs \
 *     --source /path/to/astra-integrated-book \
 *     --release 2026-09-05-integrated
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import {
  sanitizeAstraMarkdown,
  adjustChangesAfterCommentRemoval,
  normalizeAstraTypographyForChapter,
} from './astra-markdown-sanitize.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const challengeRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(challengeRoot, '..');
const dpMlDraftMap = JSON.parse(
  fs.readFileSync(path.join(challengeRoot, 'src/data/dp-ml-draft-map.json'), 'utf8'),
).map;

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
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

function parseArgs(argv) {
  const args = { source: '', release: '2026-09-05-integrated' };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--source') args.source = argv[++i] || '';
    if (argv[i] === '--release') args.release = argv[++i] || args.release;
  }
  return args;
}

function inferSourceType(ref) {
  const value = String(ref || '').toLowerCase();
  if (value.startsWith('canopi:') || value.includes(':canopi')) return 'canopi';
  if (value.startsWith('govhub:') || value.startsWith('gh:')) return 'govhub';
  if (value.startsWith('astra:')) return 'astra';
  return 'cfi';
}

function sourceLabel(ref, type) {
  if (type === 'astra') return 'Astra editorial synthesis';
  if (type === 'canopi') return `Canopi ${ref}`;
  if (type === 'govhub') return `Gov Hub ${ref}`;
  return `CFI ${ref.split(':').slice(-2).join(':')}`;
}

function extractMlDraft(chapterId, baselineText) {
  const fromComment = String(baselineText || '').match(/\bml=(ML-Draft-\d+)\b/i);
  if (fromComment) return fromComment[1];
  return dpMlDraftMap[chapterId]?.mlNumber || 'ML-Draft';
}

function formatAttribution(attribution) {
  const names = [];
  for (const entry of attribution || []) {
    if (entry.author) names.push(entry.author);
    else if (entry.role) names.push(entry.role);
  }
  return [...new Set(names.length ? names : ['Astra'])];
}

function convertChange(change) {
  const finalRange = change.final_range?.utf16 || change.final_range?.codepoints;
  const originalRange = change.base_range?.utf16 || change.base_range?.codepoints;
  const operation = change.operation === 'remove' ? 'delete' : change.operation;

  const converted = {
    id: change.change_id,
    operation,
    beforeText: change.before || '',
    afterText: change.after || '',
    finalRange: {
      start: finalRange?.start ?? 0,
      end: finalRange?.end ?? 0,
    },
    contextAnchor: change.section_ref ? `section:${change.section_ref}` : undefined,
    sources: (change.source_refs || []).map((ref) => {
      const type = inferSourceType(ref);
      return {
        type,
        id: ref,
        label: sourceLabel(ref, type),
      };
    }),
    attribution: formatAttribution(change.attribution),
    rationale: change.rationale || change.title || 'Editorial change recorded by Astra.',
  };

  if (originalRange) {
    converted.originalRange = {
      start: originalRange.start,
      end: originalRange.end,
    };
  }

  if (operation === 'delete') {
    converted.attachmentRange = { ...converted.finalRange };
  }

  return converted;
}

function chapterOmitted(proposalDispositions, chapterId) {
  return proposalDispositions
    .filter(
      (entry) =>
        entry.original_chapter === chapterId
        && (entry.status === 'not_integrated' || entry.status === 'already_covered'),
    )
    .map((entry) => ({
      sourceId: entry.id || entry.source_ref,
      sourceType: inferSourceType(entry.source_ref || entry.id),
      label: entry.source_ref || entry.id,
      reason: entry.rationale || entry.status,
    }));
}

function importRelease(sourceDir, releaseId) {
  const packageManifest = JSON.parse(
    fs.readFileSync(path.join(sourceDir, 'manifest.json'), 'utf8'),
  );
  const proposalDispositions = JSON.parse(
    fs.readFileSync(path.join(sourceDir, 'proposal-dispositions.json'), 'utf8'),
  );
  const outDir = path.join(repoRoot, 'astra', 'releases', releaseId);
  fs.mkdirSync(outDir, { recursive: true });

  const chapters = [];

  for (const entry of packageManifest.chapters) {
    const dpKey = entry.chapter.toLowerCase().replace(/^dp/, 'dp');
    const normalizedKey = `dp${String(entry.chapter.replace(/^DP/i, '')).padStart(2, '0')}`;
    const srcJsonPath = path.join(sourceDir, 'chapters', `${normalizedKey}.json`);
    const srcMdPath = path.join(sourceDir, 'chapters', `${normalizedKey}.md`);
    if (!fs.existsSync(srcJsonPath) || !fs.existsSync(srcMdPath)) {
      console.warn(`Skipping missing ${normalizedKey}`);
      continue;
    }

    const rawMarkdown = fs.readFileSync(srcMdPath, 'utf8');
    const native = JSON.parse(fs.readFileSync(srcJsonPath, 'utf8'));
    const chapterDir = path.join(outDir, normalizedKey);
    fs.mkdirSync(chapterDir, { recursive: true });

    const markdown = normalizeAstraTypographyForChapter(
      sanitizeAstraMarkdown(rawMarkdown),
      entry.chapter,
    );
    const changes = adjustChangesAfterCommentRemoval(
      rawMarkdown,
      (native.changes || []).map(convertChange),
    ).map((change) => {
      const { start: rawStart, end: rawEnd } = change.finalRange;
      if (rawEnd > rawStart) {
        const { start, end } = expandRangeToWordBoundaries(markdown, rawStart, rawEnd);
        return { ...change, afterText: markdown.slice(start, end) };
      }
      return change;
    });
    const omitted = chapterOmitted(proposalDispositions, entry.chapter);
    const baselineMlDraft = extractMlDraft(entry.chapter, native.baseline?.text || '');

    const chapterManifest = {
      chapterId: entry.chapter,
      releaseId,
      baselineMlDraft,
      baselineSha256: entry.base_sha256 || native.baseline?.sha256,
      finalSha256: sha256(markdown),
      verified: true,
      changes,
      omitted,
    };

    fs.writeFileSync(path.join(chapterDir, 'chapter.md'), markdown);
    fs.writeFileSync(path.join(chapterDir, 'chapter.json'), `${JSON.stringify(chapterManifest, null, 2)}\n`);

    chapters.push({
      chapterId: entry.chapter,
      dpKey: normalizedKey,
      status: 'available',
      baselineMlDraft,
      changeCount: changes.length,
      omittedCount: omitted.length,
    });

    console.log(`Imported ${entry.chapter} (${changes.length} changes, ${omitted.length} omitted)`);
  }

  const releaseManifest = {
    releaseId,
    publishedAt: new Date().toISOString(),
    description: packageManifest.title || 'Astra integrated book synthesis',
    verified: true,
    sourcePackage: 'astra-integrated-book.zip',
    chapters,
  };

  fs.writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify(releaseManifest, null, 2)}\n`);

  const auxDocs = [
    { src: 'README.md', dest: 'README.md' },
    { src: 'change-format.md', dest: 'change-format.md' },
    { src: 'proposal-dispositions.json', dest: 'proposal-dispositions.json' },
    { src: 'verification.json', dest: 'verification.json' },
  ];
  for (const doc of auxDocs) {
    const srcPath = path.join(sourceDir, doc.src);
    if (!fs.existsSync(srcPath)) {
      console.warn(`Aux doc missing: ${doc.src}`);
      continue;
    }
    fs.copyFileSync(srcPath, path.join(outDir, doc.dest));
    console.log(`Copied ${doc.dest}`);
  }

  console.log(`Wrote release ${releaseId} with ${chapters.length} chapters to ${outDir}`);
}

const args = parseArgs(process.argv);
const defaultSource = '/tmp/astra-integrated-book/astra-integrated-book';
const sourceDir = path.resolve(args.source || defaultSource);

if (!fs.existsSync(path.join(sourceDir, 'manifest.json'))) {
  console.error(`Source manifest not found at ${sourceDir}`);
  process.exit(1);
}

importRelease(sourceDir, args.release);
