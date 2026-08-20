export const ONBOARD_TAB_IDS = [
  'brief',
  'dp',
  'values',
  'own',
  'partners',
  'primitives',
  'rights',
  'next',
  'community',
] as const;

export type OnboardTabId = (typeof ONBOARD_TAB_IDS)[number];

export const ONBOARD_TABS: { id: OnboardTabId; label: string }[] = [
  { id: 'brief', label: 'Brief' },
  { id: 'dp', label: 'Desirable Properties' },
  { id: 'values', label: 'Values & mission' },
  { id: 'own', label: 'Own layer' },
  { id: 'partners', label: 'Partners' },
  { id: 'primitives', label: 'Primitives' },
  { id: 'rights', label: 'Rights & consent' },
  { id: 'next', label: 'Next steps' },
  { id: 'community', label: 'Community Chat' },
];

export const PAD_PATH = '/pad';

const DEFAULT_PAD_PUBLIC_BASE = 'https://desirableproperties.org';

/** Public site origin for absolute pad links (email, copy, staging via env). */
export function padPublicBase(): string {
  const base =
    process.env.NEXT_PUBLIC_DP_PUBLIC_BASE?.trim() ||
    process.env.DP_PUBLIC_BASE?.trim() ||
    DEFAULT_PAD_PUBLIC_BASE;
  return base.replace(/\/$/, '');
}

/** Absolute URL for a landing pad (e.g. https://desirableproperties.org/pad/project-liberty). */
export function padAbsoluteHref(slug: string, tab?: OnboardTabId | null): string {
  return `${padPublicBase()}${padHref(slug, tab)}`;
}

/** @deprecated Use PAD_PATH */
export const ON_PATH = PAD_PATH;

export function isOnboardTabId(value: string | null | undefined): value is OnboardTabId {
  return Boolean(value && (ONBOARD_TAB_IDS as readonly string[]).includes(value));
}

export function parseOnboardTab(
  searchTab?: string | string[] | null,
  hash?: string | null,
  fallback: OnboardTabId = 'dp',
): OnboardTabId {
  const fromSearch = Array.isArray(searchTab) ? searchTab[0] : searchTab;
  if (isOnboardTabId(fromSearch)) return fromSearch;
  const fromHash = String(hash || '').replace(/^#/, '');
  if (isOnboardTabId(fromHash)) return fromHash;
  return isOnboardTabId(fallback) ? fallback : 'dp';
}

export function padHref(slug: string, tab?: OnboardTabId | null): string {
  const base = `${PAD_PATH}/${encodeURIComponent(slug)}`;
  if (!tab) return base;
  return `${base}?tab=${encodeURIComponent(tab)}`;
}

/** @deprecated Use padHref */
export function onHref(slug: string, tab?: OnboardTabId | null): string {
  return padHref(slug, tab);
}

/** @deprecated Use padHref */
export function allianceTabHref(slug: string, tab: OnboardTabId): string {
  return padHref(slug, tab);
}
