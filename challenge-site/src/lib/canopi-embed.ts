/** Canopi web-embed for challenge-site pages (Discuss sidebar). */

export const DP_CANOPI_EMBED_ID = '7f3e9a2b-1c4d-5e6f-8a9b-0d1e2f3a4b5c';

export const DP_CANOPI_EMBED_SCRIPT = 'https://api.canopi.live/embed/v1.js';

export const DP_CANOPI_COMMUNITY_ID = 'c0f30bc5-de17-4328-80d9-ff8f364907da';

/** Prod origin used for Canopi pageId hashing (staging mirrors prod threads). */
export const DP_CANOPI_SITE_ORIGIN = 'https://desirableproperties.org';

export const FORK_PERSPECTIVE_PATH = '/perspectives/a-fork-in-the-web';

/** Open Discuss on a challenge-site perspective page. */
export function perspectiveDiscussHref(path: string = FORK_PERSPECTIVE_PATH): string {
  const base = path.includes('?') ? path : `${path}?discuss=1`;
  return base.includes('discuss=1') ? base : `${base}${base.includes('?') ? '&' : '?'}discuss=1`;
}

/** Canonical page URL passed to Canopi (prod host even on staging). */
export function canopiPageUrlForPath(pathname: string): string {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${DP_CANOPI_SITE_ORIGIN.replace(/\/$/, '')}${path}`;
}
