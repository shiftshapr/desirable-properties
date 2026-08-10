/** DP seal wireframe assets (same stack as BRC333 desirableproperties-badges-ordinal). */

export const DP_BADGE_SEAL_SRC = '/images/badges/dp/seal-base.webp';

/** Pearl agent-drop image (UUID 9507813d-55d4-41e7-a960-db440c07556f). */
export const PEARL_AGENT_DROP_IMAGE = '/images/badges/pearl.webp';

export const FORK_SERIES_SLUG = 'fork-in-the-web-workshops';
export const FORK_SERIES_BADGE_TOP_LABEL = 'A Fork in the Web';
export const FORK_SERIES_BADGE_CENTER =
  '/images/perspectives/a-fork-in-the-web/a-fork-in-the-web-hero-draft.webp';
export const FORK_PEARL_BADGE_CENTER = PEARL_AGENT_DROP_IMAGE;

/** Default center overlays for Fork workshop series badge seed / admin. */
export const FORK_SERIES_BADGE_IMAGE_URL = FORK_SERIES_BADGE_CENTER;
export const FORK_PEARL_BADGE_IMAGE_URL = FORK_PEARL_BADGE_CENTER;

export function forkSeriesBadgeTopLabel(slug: string, fallbackTitle?: string | null): string {
  if (slug === FORK_SERIES_SLUG) return FORK_SERIES_BADGE_TOP_LABEL;
  return (fallbackTitle || 'Event series').trim();
}

export function pearlBadgeCenterUrl(
  pearlBadgeImageUrl: string | null | undefined,
  badgeImageUrl: string | null | undefined,
): string | null {
  return pearlBadgeImageUrl || badgeImageUrl || null;
}
