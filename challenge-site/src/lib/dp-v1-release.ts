/** Version 1.0 of the Desirable Properties book: launch time, the PDF and the online book. */

/** Friday 13 November 2026, 10am PT: the launch event starts and the PDF goes up. */
export const V1_LAUNCH_AT = new Date('2026-11-13T18:00:00Z');
export const V1_LAUNCH_LABEL = 'Friday, November 13 · 10–11am PT · live on Zoom';
export const V1_LAUNCH_REGISTER_URL = 'https://bit.ly/dp-nov-13';
/** Served from public/downloads/ (tracked, like the other book PDFs). */
export const V1_PDF_HREF = '/downloads/desirable-properties-v1.0.pdf';
/** The online book (proxied to book.desirableproperties.org). */
export const V1_READ_ONLINE_HREF = '/book/';
export const V1_COVER_SRC = 'https://book.desirableproperties.org/assets/cover.png';

export function v1Released(now: Date = new Date()): boolean {
  return now.getTime() >= V1_LAUNCH_AT.getTime();
}
