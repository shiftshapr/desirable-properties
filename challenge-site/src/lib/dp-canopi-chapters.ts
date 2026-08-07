export const DP_CANOPI_COMMUNITY_ID = 'c0f30bc5-de17-4328-80d9-ff8f364907da';

/** Prod book host for Canopi pageId hashing (staging book uses prod pageUrlOrigin). */
export const DP_CANOPI_BOOK_ORIGIN = 'https://book.desirableproperties.org';

export const DP_CANOPI_CHAPTERS = [
  { value: '', label: 'All chapters' },
  { value: 'intro', label: 'Intro' },
  ...Array.from({ length: 23 }, (_, i) => {
    const n = String(i + 1).padStart(2, '0');
    return { value: `dp${n}`, label: `DP${i + 1}` };
  }),
];

/** Canopi stores pageId as a slug of host+pathname (metaweb-book pattern). */
export function canopiPageIdFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = (u.hostname || '').replace(/^www\./, '');
    return `${host}${u.pathname}`.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 100).toLowerCase();
  } catch {
    return String(url || '')
      .replace(/^https?:\/\//, '')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 100)
      .toLowerCase();
  }
}

/** Short chapter key (`dp01`) + hashed book viewer pageId for Canopi message lookup. */
export function canopiPageIdsForDp(dpId: string | null | undefined): string[] {
  if (!dpId) return [];
  const n = String(dpId).replace(/^DP/i, '').trim();
  if (!/^\d{1,2}$/.test(n)) return [];
  const padded = n.padStart(2, '0');
  const short = `dp${padded}`;
  const hashed = canopiPageIdFromUrl(`${DP_CANOPI_BOOK_ORIGIN}/viewer/${short}`);
  const out = [hashed, short];
  if (Number(n) !== Number(padded)) out.push(`dp${Number(n)}`);
  return [...new Set(out)];
}
