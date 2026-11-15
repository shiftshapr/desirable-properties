import fs from 'fs';
import path from 'path';
import { GOVHUB_PUBLIC_BASE_URL } from '@/lib/govhub';
import type { EditionResolution, EditionsManifest } from '@/lib/book-editions';
import { resolveEdition } from '@/lib/book-editions';
import { fetchChapterPassages } from '@/lib/workgroup-review-govhub';

// The edition record of the Gov Hub this site talks to. Production: the committed manifest, generated from
// production Gov Hub by the production rail sync. Staging (dev Gov Hub): point BOOK_EDITIONS_MANIFEST at the
// staging book's manifest, which the staging rail sync generates from dev (never committed).
const MANIFEST =
  process.env.BOOK_EDITIONS_MANIFEST || path.resolve(process.cwd(), '..', 'desirableproperties-book/json/editions.json');

let cache: { mtimeMs: number; manifest: EditionsManifest | null } | null = null;

/** The book's edition record, or null when it is not there (the site then answers as before). */
export function readEditionsManifest(): EditionsManifest | null {
  try {
    const { mtimeMs } = fs.statSync(MANIFEST);
    if (cache && cache.mtimeMs === mtimeMs) return cache.manifest;
    const data = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) as EditionsManifest;
    const manifest = Array.isArray(data?.editions) && data.editions.length ? data : null;
    cache = { mtimeMs, manifest };
    return manifest;
  } catch {
    return null;
  }
}

/**
 * A chapter's passages for an API answer, with its edition. `edition` null = the live text.
 * A named edition whose revision is not live comes from Gov Hub `chapter-passages/?edition=<id>` (exact revision
 * text); Gov Hub's 404s (EDITION_NOT_FOUND, NOT_IN_A_BOOK, NOT_IN_EDITION) are passed on, and an answer for a
 * different revision is refused, never returned as the live text mislabelled.
 */
export async function chapterPassagesWithEdition(
  draftRef: string,
  edition: string | null,
): Promise<{ ok: true; passages: string[]; resolution: EditionResolution | null } | { ok: false; status: number; error: string }> {
  const resolution = resolveEdition(readEditionsManifest(), draftRef, edition);
  if (resolution && !resolution.ok) return resolution;
  if (!resolution || resolution.isLive) {
    return { ok: true, passages: await fetchChapterPassages(draftRef), resolution };
  }
  const res = await fetch(
    `${GOVHUB_PUBLIC_BASE_URL}/api/doc/draft/${encodeURIComponent(draftRef)}/chapter-passages/?edition=${encodeURIComponent(edition || '')}`,
    { cache: 'no-store', headers: { Accept: 'application/json' } },
  );
  const data = (await res.json().catch(() => ({}))) as {
    passages?: unknown; edition?: unknown; submission_id?: unknown; error?: unknown; error_code?: unknown;
  };
  if (!res.ok) {
    const code = typeof data.error_code === 'string' ? ` (${data.error_code})` : '';
    return { ok: false, status: res.status, error: `${typeof data.error === 'string' ? data.error : `Gov Hub answered ${res.status}`}${code}` };
  }
  const expected = resolution.fields.submissionId;
  if (data.edition !== edition || (expected && data.submission_id !== expected) || !Array.isArray(data.passages)) {
    return { ok: false, status: 502, error: `Gov Hub's answer is not the ${resolution.fields.editionLabel} revision` };
  }
  return { ok: true, passages: data.passages.filter((p): p is string => typeof p === 'string'), resolution };
}
