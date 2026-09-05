import { isDpChallengeWorkgroup } from '@/lib/govhub';

export const WORKGROUP_COLLAB_TABS = [
  { key: 'getting-started', label: 'Getting Started' },
  { key: 'members', label: 'Members' },
  { key: 'chat', label: 'Workgroup Chat' },
  { key: 'astra', label: 'Astra' },
  { key: 'edit', label: 'Edit' },
  { key: 'external-chat', label: 'External Chat' },
  { key: 'activity', label: 'Activity' },
  { key: 'invite', label: 'Invite with Email' },
] as const;

export type WorkgroupCollabTabKey = (typeof WORKGROUP_COLLAB_TABS)[number]['key'];

export const WORKGROUP_CANOPI_TAB_KEYS = new Set<WorkgroupCollabTabKey>([
  'getting-started',
  'astra',
  'edit',
]);

export function normalizeWorkgroupCollabTab(
  tab: string | null | undefined,
): WorkgroupCollabTabKey {
  const allowed = new Set(WORKGROUP_COLLAB_TABS.map((item) => item.key));
  if (tab && allowed.has(tab as WorkgroupCollabTabKey)) {
    return tab as WorkgroupCollabTabKey;
  }
  return 'getting-started';
}

export function visibleWorkgroupCollabTabs(opts: {
  dpId: string | null;
  workgroup: { name?: string | null; slug?: string | null };
}): Array<(typeof WORKGROUP_COLLAB_TABS)[number]> {
  const showEdit = isDpChallengeWorkgroup(opts.workgroup);
  return WORKGROUP_COLLAB_TABS.filter((item) => item.key !== 'edit' || showEdit);
}
