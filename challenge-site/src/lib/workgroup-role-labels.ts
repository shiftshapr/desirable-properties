import {
  CO_LEAD_ROLE,
  COORDINATOR_ROLE,
  MEMBER_ROLE,
} from '@/data/workgroup-roles';

const POSITION_LABELS: Record<string, string> = {
  coordinator: COORDINATOR_ROLE.label,
  chair: COORDINATOR_ROLE.label,
  co_lead: CO_LEAD_ROLE.label,
  'co-lead': CO_LEAD_ROLE.label,
  facilitator: 'Facilitator',
  member: MEMBER_ROLE.label,
};

/** Human-readable labels for Gov Hub position keys and coordinator. */
export function workgroupRoleLabel(key: string): string {
  const normalized = String(key || '').trim().toLowerCase();
  if (!normalized) return MEMBER_ROLE.label;
  return POSITION_LABELS[normalized] || key.replace(/_/g, ' ');
}

export function resolveWorkgroupMemberRoles(
  member: { user_id: string; positions: string[] },
  coordinatorId?: string | null,
): string[] {
  const roles = new Set<string>();
  if (coordinatorId && member.user_id === coordinatorId) {
    roles.add('coordinator');
  }
  for (const position of member.positions) {
    const key = String(position || '').trim().toLowerCase();
    if (key) roles.add(key);
  }
  if (roles.size === 0) roles.add('member');
  return [...roles];
}

export function formatWorkgroupRoleBadges(
  member: { user_id: string; positions: string[] },
  coordinatorId?: string | null,
): string[] {
  return resolveWorkgroupMemberRoles(member, coordinatorId).map(workgroupRoleLabel);
}
