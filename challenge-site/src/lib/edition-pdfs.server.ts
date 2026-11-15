import fs from 'fs';
import os from 'os';
import path from 'path';
import { GOVHUB_PUBLIC_BASE_URL } from '@/lib/govhub';
import type { EditionPdfsState } from '@/lib/edition-pdfs';

const WORK = 'desirableproperties-book';
const TTL_MS = 3 * 60 * 1000;

/** Where the backend job stores published PDFs on this box (outside any checkout or deploy target). */
export function editionPdfStore(): string {
  if (process.env.EDITION_PDF_STORE) return process.env.EDITION_PDF_STORE;
  const staging = ['staging'].includes((process.env.DP_ENV || '').toLowerCase()) ||
    (process.env.DP_PUBLIC_BASE || '').includes('staging.');
  return path.join(os.homedir(), staging ? 'dp-edition-pdfs-staging' : 'dp-edition-pdfs', 'store');
}

/** The archive copy committed to the repo (only used until the job has published that edition on this box). */
export function editionArchiveDir(editionId: string): string {
  return path.resolve(process.cwd(), '..', 'desirableproperties-book', 'downloads', 'editions', editionId);
}

let cache: { at: number; state: EditionPdfsState } | null = null;

function usable(data: unknown): EditionPdfsState | null {
  const d = data as EditionPdfsState | null;
  return d && Array.isArray(d.editions) ? d : null;
}

/**
 * Gov Hub's answer, cached a few minutes; on failure the last good answer, then the job's local copy
 * (<store>/latest.json), then null (callers fall back to /downloads/latest/…).
 */
export async function getEditionPdfs(): Promise<EditionPdfsState | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.state;
  try {
    const res = await fetch(`${GOVHUB_PUBLIC_BASE_URL}/api/doc/editions/pdfs/?work=${WORK}`, {
      cache: 'no-store', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(6000),
    });
    let state = res.ok ? usable(await res.json()) : null;
    // Gov Hub answers but nothing is published yet on this box's Gov Hub: the archived edition is still offered.
    if (state && !state.latest) state = archiveState() || state;
    if (state) {
      cache = { at: Date.now(), state };
      return state;
    }
  } catch {
    /* fall through to the last good answer */
  }
  if (cache) return cache.state;
  try {
    const local = usable(JSON.parse(fs.readFileSync(path.join(editionPdfStore(), 'latest.json'), 'utf8')));
    if (local) return local;
  } catch {
    /* no local copy */
  }
  return archiveState();
}

/**
 * Last resort: the archive copies committed to the repo (desirableproperties-book/downloads/editions/<id>/), so a
 * box whose job has not published yet, with Gov Hub unreachable, still offers the newest archived edition.
 */
function archiveState(): EditionPdfsState | null {
  const root = path.resolve(process.cwd(), '..', 'desirableproperties-book', 'downloads', 'editions');
  let sets: EditionPdfsState['editions'] = [];
  try {
    for (const id of fs.readdirSync(root)) {
      const dir = path.join(root, id);
      const meta = ['record.json', 'build-report.json'].map((f) => path.join(dir, f)).find((f) => fs.existsSync(f));
      if (!meta || !fs.existsSync(path.join(dir, 'SHA256SUMS'))) continue;
      const m = JSON.parse(fs.readFileSync(meta, 'utf8')) as { label?: string; editionReleasedAt?: string };
      const sums = Object.fromEntries(fs.readFileSync(path.join(dir, 'SHA256SUMS'), 'utf8').split('\n')
        .filter((l) => l.includes('  ')).map((l) => [l.split('  ')[1], l.split('  ')[0]]));
      const entry = (file: string) => ({ url: `/downloads/${id}/${file}`, file, sha256: sums[file], pages: 0, bytes: fs.statSync(path.join(dir, file)).size });
      const chapters = Object.fromEntries(Object.keys(sums).filter((f) => f !== 'book.pdf').map((f) => [f.replace(/\.pdf$/, ''), entry(f)]));
      sets.push({ editionId: id, label: m.label || id, fixture: false, state: 'published', reason: null,
        book: sums['book.pdf'] ? entry('book.pdf') : null, chapters, publishedAt: m.editionReleasedAt || null });
    }
  } catch {
    return null;
  }
  if (!sets.length) return null;
  sets = sets.sort((a, b) => a.editionId.localeCompare(b.editionId, 'en', { numeric: true })).reverse();
  return { latest: sets[0], editions: sets };
}

/** The stored file for /downloads/<edition>/<file>, and its sha256 from SHA256SUMS. */
export function storedPdf(editionId: string, file: string): { path: string; sha256: string | null } | null {
  for (const dir of [path.join(editionPdfStore(), editionId), editionArchiveDir(editionId)]) {
    const p = path.join(dir, file);
    if (!fs.existsSync(p)) continue;
    let sha: string | null = null;
    try {
      const line = fs.readFileSync(path.join(dir, 'SHA256SUMS'), 'utf8').split('\n').find((l) => l.endsWith(`  ${file}`));
      sha = line ? line.split(' ')[0] : null;
    } catch {
      sha = null;
    }
    return { path: p, sha256: sha };
  }
  return null;
}
