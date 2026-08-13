export const DP_ADMIN_TAB_LABELS = {
  blueberries: 'Blueberries',
  support: 'Support',
  broadcast: 'Broadcast',
  messages: 'Site messages',
  'invite-content': 'Invite content',
  'event-series': 'Event series',
  site: 'Site admin',
} as const;

export type DpAdminTabKey = keyof typeof DP_ADMIN_TAB_LABELS;

export const DP_ADMIN_GROUPS = [
  {
    key: 'community',
    label: 'Community',
    tabs: ['blueberries'] as const satisfies readonly DpAdminTabKey[],
  },
  {
    key: 'outreach',
    label: 'Outreach',
    tabs: ['broadcast', 'messages', 'invite-content'] as const satisfies readonly DpAdminTabKey[],
  },
  {
    key: 'events',
    label: 'Events',
    tabs: ['event-series'] as const satisfies readonly DpAdminTabKey[],
  },
  {
    key: 'ops',
    label: 'Ops',
    tabs: ['support', 'site'] as const satisfies readonly DpAdminTabKey[],
  },
] as const;

export type DpAdminGroupKey = (typeof DP_ADMIN_GROUPS)[number]['key'];

/** @deprecated Use DP_ADMIN_TAB_LABELS — kept for callers expecting { key, label }[] */
export const DP_ADMIN_TABS = (Object.entries(DP_ADMIN_TAB_LABELS) as [DpAdminTabKey, string][]).map(
  ([key, label]) => ({ key, label }),
);

export function normalizeDpAdminTab(tab: string | null | undefined): DpAdminTabKey {
  if (tab && tab in DP_ADMIN_TAB_LABELS) {
    return tab as DpAdminTabKey;
  }
  return 'support';
}

export function dpAdminTabGroup(tab: DpAdminTabKey): DpAdminGroupKey {
  for (const group of DP_ADMIN_GROUPS) {
    if ((group.tabs as readonly string[]).includes(tab)) return group.key;
  }
  return 'ops';
}

export function defaultTabForDpAdminGroup(group: DpAdminGroupKey): DpAdminTabKey {
  const cfg = DP_ADMIN_GROUPS.find((g) => g.key === group);
  return cfg?.tabs[0] ?? 'support';
}
