import fs from 'fs';
import path from 'path';
import { GOVHUB_PUBLIC_BASE_URL } from '@/lib/govhub';
import type { EditionResolution, EditionsManifest } from '@/lib/book-editions';
import { resolveEdition } from '@/lib/book-editions';
import { fetchChapterPassages } from '@/lib/workgroup-review-govhub';

const MANIFEST = path.resolve(process.cwd(), '..', 'desirableproperties-book/json/editions.json');

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
 * A named edition whose revision is not live comes from Gov Hub `chapter-passages/?edition=`, and only
 * when Gov Hub confirms that edition; otherwise the answer is an error, never the live text mislabelled.
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
  const data = (await res.json().catch(() => ({}))) as { passages?: unknown; edition?: unknown; submission_id?: unknown };
  const confirmed = data.edition === edition || (resolution.fields.submissionId && data.submission_id === resolution.fields.submissionId);
  if (!res.ok || !confirmed || !Array.isArray(data.passages)) {
    return { ok: false, status: 501, error: `The text of ${resolution.fields.editionLabel} is not served yet` };
  }
  return { ok: true, passages: data.passages.filter((p): p is string => typeof p === 'string'), resolution };
}
