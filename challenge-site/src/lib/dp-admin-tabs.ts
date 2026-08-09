export const DP_ADMIN_TABS = [
  { key: 'blueberries', label: 'Blueberries' },
  { key: 'support', label: 'Support' },
  { key: 'broadcast', label: 'Broadcast' },
  { key: 'messages', label: 'Site messages' },
  { key: 'invite-content', label: 'Invite content' },
  { key: 'site', label: 'Site admin' },
] as const;

export type DpAdminTabKey = (typeof DP_ADMIN_TABS)[number]['key'];

export function normalizeDpAdminTab(tab: string | null | undefined): DpAdminTabKey {
  const allowed = new Set(DP_ADMIN_TABS.map((item) => item.key));
  if (tab && allowed.has(tab as DpAdminTabKey)) {
    return tab as DpAdminTabKey;
  }
  return 'support';
}
