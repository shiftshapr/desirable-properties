/** Strip trailing ampersands from pad slugs (common copy/paste typo in bookmarks). */
export function stripTrailingAmpSlugTypo(slug: string): string {
  return slug.replace(/&+$/g, '');
}

/**
 * If pathname is /pad/{slug} or /on/{slug} with a trailing-& typo, return the canonical path.
 */
export function padSlugTypoRedirectPath(pathname: string): string | null {
  const match = pathname.match(/^\/(?:pad|on)\/([^/]+)$/);
  if (!match) return null;

  let raw = match[1];
  try {
    raw = decodeURIComponent(raw);
  } catch {
    /* keep encoded segment */
  }

  const cleaned = stripTrailingAmpSlugTypo(raw);
  if (!cleaned || cleaned === raw) return null;

  const prefix = pathname.startsWith('/on/') ? '/on/' : '/pad/';
  return `${prefix}${encodeURIComponent(cleaned)}`;
}
