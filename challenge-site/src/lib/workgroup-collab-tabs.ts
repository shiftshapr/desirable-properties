export const WORKGROUP_COLLAB_TABS = [
  { key: 'getting-started', label: 'Getting Started' },
  { key: 'members', label: 'Members' },
  { key: 'chat', label: 'Workgroup Chat' },
  { key: 'astra', label: 'Astra' },
  { key: 'review', label: 'Review' },
  { key: 'external-chat', label: 'External Chat' },
  { key: 'activity', label: 'Activity' },
  { key: 'invite', label: 'Invite with Email' },
] as const;

export type WorkgroupCollabTabKey = (typeof WORKGROUP_COLLAB_TABS)[number]['key'];

export const WORKGROUP_CANOPI_TAB_KEYS = new Set<WorkgroupCollabTabKey>([
  'getting-started',
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
  const allowed = new Set(WORKGROUP_COLLAB_TABS.map((item) => item.key));
  if (tab && allowed.has(tab as WorkgroupCollabTabKey)) {
    return tab as WorkgroupCollabTabKey;
  }
  return 'getting-started';
}

export function visibleWorkgroupCollabTabs(_opts?: {
  dpId: string | null;
  workgroup: { name?: string | null; slug?: string | null };
}): Array<(typeof WORKGROUP_COLLAB_TABS)[number]> {
  return [...WORKGROUP_COLLAB_TABS];
}
