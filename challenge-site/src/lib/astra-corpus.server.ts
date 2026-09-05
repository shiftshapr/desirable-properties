import fs from 'fs';
import path from 'path';
import type {
  AstraChapterBundle,
  AstraChapterManifest,
  AstraReleaseManifest,
} from '@/lib/astra-types';
import { dpIdToAstraKey, astraKeyToDpId } from '@/lib/astra-utils';

export { dpIdToAstraKey, astraKeyToDpId };

const DEFAULT_RELEASE_ID = '2026-09-05-integrated';

function astraRootDir(): string {
  const explicit = process.env.ASTRA_CORPUS_ROOT?.trim();
  if (explicit) return path.resolve(explicit);
  return path.resolve(process.cwd(), '..', 'astra');
}

export function activeAstraReleaseId(): string {
  return process.env.ASTRA_RELEASE_ID?.trim() || DEFAULT_RELEASE_ID;
}

function releaseDir(releaseId = activeAstraReleaseId()): string {
  return path.join(astraRootDir(), 'releases', releaseId);
}

export function readAstraReleaseManifest(releaseId = activeAstraReleaseId()): AstraReleaseManifest {
  const manifestPath = path.join(releaseDir(releaseId), 'manifest.json');
  const raw = fs.readFileSync(manifestPath, 'utf8');
  return JSON.parse(raw) as AstraReleaseManifest;
}

export function readAstraChapterBundle(
  dpKey: string,
  releaseId = activeAstraReleaseId(),
): AstraChapterBundle | null {
  const chapterDir = path.join(releaseDir(releaseId), dpKey.toLowerCase());
  const mdPath = path.join(chapterDir, 'chapter.md');
  const jsonPath = path.join(chapterDir, 'chapter.json');
  if (!fs.existsSync(mdPath) || !fs.existsSync(jsonPath)) {
    return null;
  }
  const markdown = fs.readFileSync(mdPath, 'utf8');
  const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as AstraChapterManifest;
  return { markdown, manifest };
}

export function listAstraDpKeys(releaseId = activeAstraReleaseId()): string[] {
  const manifest = readAstraReleaseManifest(releaseId);
  return manifest.chapters.map((entry) => entry.dpKey);
}

export const ASTRA_RELEASE_DOC_NAMES = [
  'readme',
  'change-format',
  'dispositions',
  'verification',
] as const;

export type AstraReleaseDocName = (typeof ASTRA_RELEASE_DOC_NAMES)[number];

const RELEASE_DOC_FILES: Record<AstraReleaseDocName, string> = {
  readme: 'README.md',
  'change-format': 'change-format.md',
  dispositions: 'proposal-dispositions.json',
  verification: 'verification.json',
};

export function isAstraReleaseDocName(name: string): name is AstraReleaseDocName {
  return (ASTRA_RELEASE_DOC_NAMES as readonly string[]).includes(name);
}

export type AstraReleaseDoc = {
  name: AstraReleaseDocName;
  filename: string;
  contentType: 'markdown' | 'json';
  text: string;
};

export function readAstraReleaseDoc(
  name: AstraReleaseDocName,
  releaseId = activeAstraReleaseId(),
): AstraReleaseDoc {
  const filename = RELEASE_DOC_FILES[name];
  const docPath = path.join(releaseDir(releaseId), filename);
  if (!fs.existsSync(docPath)) {
    throw new Error(`Release doc not found: ${filename}`);
  }
  const text = fs.readFileSync(docPath, 'utf8');
  const contentType = filename.endsWith('.json') ? 'json' : 'markdown';
  return { name, filename, contentType, text };
}
