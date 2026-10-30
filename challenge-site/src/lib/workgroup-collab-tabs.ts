/**
 * Five tabs (owner, 2026-10-22: orient the page to co-editors). Co-editing replaced Astra in the tab bar
 * (owner, 2026-10-30); Astra stays reachable from old links (?tab=astra, change and proposal links).
 * Retired keys map in RETIRED_TABS.
 */
export const WORKGROUP_COLLAB_TABS = [
  { key: 'next-steps', label: 'Next steps' },
  { key: 'review', label: 'Review' },
  { key: 'co-editing', label: 'Co-editing' },
  { key: 'chat', label: 'Chat' },
  { key: 'members', label: 'Members' },
  { key: 'astra', label: 'Astra', hidden: true },
] as const;

/** Old ?tab= values: Getting Started and Activity are on Next steps, External Chat on Chat, invites on Members. */
const RETIRED_TABS: Record<string, string> = {
  'getting-started': 'next-steps',
  activity: 'next-steps',
  'external-chat': 'chat',
  invite: 'members',
};

export type WorkgroupCollabTabKey = (typeof WORKGROUP_COLLAB_TABS)[number]['key'];

export const WORKGROUP_CANOPI_TAB_KEYS = new Set<WorkgroupCollabTabKey>([
  'next-steps',
  'astra',
]);

/** Retired Edit-tab hashes: Astra patch management stays on Astra; other anchors go to Review. */
export function resolveRetiredEditTab(hash?: string | null): WorkgroupCollabTabKey {
  const normalized = String(hash || '').trim();
  if (normalized === '#astra-patches') return 'astra';
  return 'review';
}

export function normalizeWorkgroupCollabTab(
  tab: string | null | undefined,
  hash?: string | null,
): WorkgroupCollabTabKey {
  if (tab === 'edit') {
    return resolveRetiredEditTab(hash);
  }
  const allowed = new Set<string>(WORKGROUP_COLLAB_TABS.map((item) => item.key));
  const key = tab ? RETIRED_TABS[tab] ?? tab : null;
  if (key && allowed.has(key)) {
    return key as WorkgroupCollabTabKey;
  }
  return 'next-steps';
}

export function visibleWorkgroupCollabTabs(_opts?: {
  dpId: string | null;
  workgroup: { name?: string | null; slug?: string | null };
}): Array<(typeof WORKGROUP_COLLAB_TABS)[number]> {
  // The tab bar; normalizeWorkgroupCollabTab also accepts hidden tabs.
  return WORKGROUP_COLLAB_TABS.filter((item) => !('hidden' in item && item.hidden));
}
