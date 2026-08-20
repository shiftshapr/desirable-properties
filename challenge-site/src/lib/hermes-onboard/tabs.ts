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

export function isOnboardTabId(value: string | null | undefined): value is OnboardTabId {
  return Boolean(value && (ONBOARD_TAB_IDS as readonly string[]).includes(value));
}

export function parseOnboardTab(
  searchTab?: string | string[] | null,
  hash?: string | null,
): OnboardTabId {
  const fromSearch = Array.isArray(searchTab) ? searchTab[0] : searchTab;
  if (isOnboardTabId(fromSearch)) return fromSearch;
  const fromHash = String(hash || '').replace(/^#/, '');
  if (isOnboardTabId(fromHash)) return fromHash;
  return 'brief';
}

export function allianceTabHref(slug: string, tab: OnboardTabId): string {
  return `/onboard/alliance/${encodeURIComponent(slug)}?tab=${encodeURIComponent(tab)}`;
}
