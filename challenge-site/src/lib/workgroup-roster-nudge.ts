export const WORKGROUP_TARGET_MEMBER_COUNT = 3;

export type WorkgroupRosterNudge = {
  kind: 'recruit' | 'ready';
  memberCount: number;
  remaining: number;
  title: string;
  message: string;
};

export function workgroupRosterNudge(memberCount: number): WorkgroupRosterNudge {
  const count = Math.max(0, Number.isFinite(memberCount) ? memberCount : 0);
  const remaining = WORKGROUP_TARGET_MEMBER_COUNT - count;
  if (remaining > 0) {
    const memberLabel = count === 1 ? '1 member' : `${count} members`;
    const needLabel =
      remaining === 1
        ? '1 more person'
        : `${remaining} more people`;
    return {
      kind: 'recruit',
      memberCount: count,
      remaining,
      title: count === 0 ? 'No members yet' : memberLabel,
      message: `We want at least ${WORKGROUP_TARGET_MEMBER_COUNT} people in every workgroup. This group needs ${needLabel}. Invite others who care about this property.`,
    };
  }
  const memberLabel = count === 1 ? '1 member' : `${count} members`;
  return {
    kind: 'ready',
    memberCount: count,
    remaining: 0,
    title: memberLabel,
    message:
      'On track for a working group. Keep going toward Version 1.0 on November 13, 2026.',
  };
}
