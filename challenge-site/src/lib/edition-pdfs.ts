/**
 * Edition PDFs as Gov Hub records them (GET /api/doc/editions/pdfs/?work=…; docs/EDITIONS.md). Gov Hub decides
 * what is latest; nothing here names an edition. PDFs are built once per edition by the backend job and served as
 * stored files: /downloads/<edition>/<file> (immutable) and /downloads/latest/<file> (a short-lived redirect).
 */

export type PdfFile = { url: string; file: string; sha256: string; pages: number; bytes: number };

export type EditionPdfSet = {
  editionId: string;
  label: string;
  fixture: boolean;
  state: 'building' | 'published' | 'failed';
  reason: string | null;
  book: PdfFile | null;
  chapters: Record<string, PdfFile>;
  publishedAt: string | null;
};

export type EditionPdfsState = { latest: EditionPdfSet | null; editions: EditionPdfSet[]; status?: string[] };

export const SAFE_EDITION = /^[0-9][0-9A-Za-z.-]{0,39}$/;
export const SAFE_FILE = /^[a-z0-9][a-z0-9_-]{0,60}\.pdf$/;

/** The name a file is saved under: the edition is in it (desirable-properties-v1.1.pdf, dp07-v1.1.pdf). */
export function downloadName(editionId: string, file: string): string {
  return file === 'book.pdf' ? `desirable-properties-v${editionId}.pdf` : file.replace(/\.pdf$/, `-v${editionId}.pdf`);
}

export type PdfLink = { href: string; filename: string; label: string; editionId: string | null };

/** The download a chapter offers: the latest published edition's file, labelled with that edition. */
export function chapterPdfLink(state: EditionPdfsState | null, rail: string): PdfLink {
  const latest = state?.latest;
  const file = latest?.chapters?.[rail];
  if (latest && file) {
    return { href: file.url, filename: downloadName(latest.editionId, file.file), label: `Download PDF · ${latest.label}`, editionId: latest.editionId };
  }
  // No answer from Gov Hub and no stored copy: the stable address still resolves to the newest published file.
  return { href: `/downloads/latest/${rail}.pdf`, filename: `${rail}.pdf`, label: 'Download PDF', editionId: null };
}

/** Earlier published editions of a chapter (they stay downloadable at their own addresses). */
export function earlierChapterPdfs(state: EditionPdfsState | null, rail: string): PdfLink[] {
  if (!state) return [];
  const latestId = state.latest?.editionId;
  return state.editions
    .filter((e) => e.state === 'published' && !e.fixture && e.editionId !== latestId && e.chapters?.[rail])
    .map((e) => ({ href: e.chapters[rail].url, filename: downloadName(e.editionId, e.chapters[rail].file), label: e.label, editionId: e.editionId }));
}

/** The latest published set holding a given file (book.pdf or <rail>.pdf), for /downloads/latest/<file>. */
export function latestUrlFor(state: EditionPdfsState | null, file: string): string | null {
  const latest = state?.latest;
  if (!latest) return null;
  if (file === 'book.pdf') return latest.book?.url ?? null;
  return latest.chapters?.[file.replace(/\.pdf$/, '')]?.url ?? null;
}
