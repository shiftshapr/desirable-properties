/** Extract DP number from book viewer URLs (/viewer/dp07, etc.). */
export function dpFocusFromPageUrl(url: string | null | undefined): number | null {
  if (!url) return null;
  const match = String(url).match(/\/viewer\/dp(\d{1,2})(?:[^0-9]|$)/i);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  return Number.isFinite(n) && n >= 1 && n <= 23 ? n : null;
}

export function embedHermesSurface(kind: 'assist' | 'agent', pageUrl?: string | null): string {
  const host = 'book.desirableproperties.org/embed';
  if (kind === 'agent') return `${host}/agent`;
  return `${host}/assist`;
}
