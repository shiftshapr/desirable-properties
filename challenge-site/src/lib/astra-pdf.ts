/** Astra PDF download paths (client-safe; matches generate-astra-book-pdf.py output). */

export const ASTRA_PDF_RELEASE_ID = '2026-09-05-integrated';

/** Full integrated Astra book PDF for offline reading. */
export function astraBookPdfHref(releaseId = ASTRA_PDF_RELEASE_ID): string {
  return `/downloads/astra/astra-community-review-draft-${releaseId}.pdf`;
}

/** Per-chapter Astra synthesis PDF (dp01, dp02, …). */
export function astraChapterPdfHref(dpKey: string): string {
  const key = String(dpKey || '').trim().toLowerCase();
  if (!/^dp\d{2}$/.test(key)) return astraBookPdfHref();
  return `/downloads/astra/${key}.pdf`;
}
