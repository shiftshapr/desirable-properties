import fs from 'fs';
import path from 'path';
import { DP_BOOK_ORIGIN, GOVHUB_PUBLIC_BASE_URL } from '@/lib/govhub';
import type { EditionResolution, EditionsManifest } from '@/lib/book-editions';
import { resolveEdition } from '@/lib/book-editions';
import { fetchChapterPassages } from '@/lib/workgroup-review-govhub';

// The edition record of the book this site serves. Read from the repo checkout when the book tree sits beside
// the site (BOOK_EDITIONS_MANIFEST overrides the path); otherwise from the site's own book host
// (DP_BOOK_ORIGIN: staging.book… on staging, book… on production), so each environment reads its own record.
const LOCAL_MANIFEST =
  process.env.BOOK_EDITIONS_MANIFEST || path.resolve(process.cwd(), '..', 'desirableproperties-book/json/editions.json');
const REMOTE_TTL_MS = 5 * 60 * 1000;

let cache: { key: string; at: number; manifest: EditionsManifest | null } | null = null;

function usable(data: unknown): EditionsManifest | null {
  const m = data as EditionsManifest | null;
  return m && Array.isArray(m.editions) && m.editions.length ? m : null;
}

/** The book's edition record, or null when it cannot be read (the site then answers as before). */
export async function readEditionsManifest(): Promise<EditionsManifest | null> {
  try {
    const { mtimeMs } = fs.statSync(LOCAL_MANIFEST);
    const key = `file:${mtimeMs}`;
    if (cache && cache.key === key) return cache.manifest;
    const manifest = usable(JSON.parse(fs.readFileSync(LOCAL_MANIFEST, 'utf8')));
    cache = { key, at: Date.now(), manifest };
    return manifest;
  } catch {
    /* not beside the site: read the book host's copy */
  }
  if (cache && cache.key === 'remote' && Date.now() - cache.at < REMOTE_TTL_MS) return cache.manifest;
  try {
    const res = await fetch(`${DP_BOOK_ORIGIN}/json/editions.json`, {
      cache: 'no-store', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000),
    });
    const manifest = res.ok ? usable(await res.json()) : null;
    cache = { key: 'remote', at: Date.now(), manifest };
    return manifest;
  } catch {
    return cache?.manifest ?? null;
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
  const resolution = resolveEdition(await readEditionsManifest(), draftRef, edition);
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
