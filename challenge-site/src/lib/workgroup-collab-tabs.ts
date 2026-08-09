export const WORKGROUP_COLLAB_TABS = [
  { key: 'getting-started', label: 'Getting Started' },
  { key: 'chat', label: 'Workgroup Chat' },
  { key: 'activity', label: 'Activity' },
  { key: 'invite', label: 'Invite with Email' },
] as const;

export type WorkgroupCollabTabKey = (typeof WORKGROUP_COLLAB_TABS)[number]['key'];

export function normalizeWorkgroupCollabTab(
  tab: string | null | undefined,
): WorkgroupCollabTabKey {
  const allowed = new Set(WORKGROUP_COLLAB_TABS.map((item) => item.key));
  if (tab && allowed.has(tab as WorkgroupCollabTabKey)) {
    return tab as WorkgroupCollabTabKey;
  }
  return 'getting-started';
}
