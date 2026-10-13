import { CO_EDITORS_PER_DP } from '@/data/dp-process';

/**
 * Staffing line for a workgroup card. Two co-editors make a DP fully staffed;
 * member count is shown for information only. coEditors is null when unknown
 * (Gov Hub unreachable) or not applicable (DP Discovery has no co-editors).
 */
export type WorkgroupStaffing = {
  kind: 'recruit' | 'ready' | 'info';
  title: string;
  message: string;
};

export function workgroupStaffing({
  memberCount,
  coEditors,
}: {
  memberCount: number;
  coEditors: number | null;
}): WorkgroupStaffing {
  const count = Math.max(0, Number.isFinite(memberCount) ? memberCount : 0);
  const members = count === 0 ? 'No members yet' : count === 1 ? '1 member' : `${count} members`;
  if (coEditors === null) {
    return { kind: 'info', title: members, message: 'Join to take part.' };
  }
  const open = Math.max(0, CO_EDITORS_PER_DP - coEditors);
  if (open > 0) {
    return {
      kind: 'recruit',
      title: `${members} · co-editors ${coEditors} of ${CO_EDITORS_PER_DP}`,
      message: `Needs ${open} more co-editor${open === 1 ? '' : 's'}. Co-editors decide which proposals go into Version 1.0; any member can step up.`,
    };
  }
  return {
    kind: 'ready',
    title: `${members} · fully staffed`,
    message: 'Two co-editors in place. On track for Version 1.0 on November 13, 2026.',
  };
}

/** "1 of 2" (Gov Hub readiness detail) → 1; null if absent. */
export function coEditorCountFromDetail(detail: string | null | undefined): number | null {
  const match = String(detail || '').match(/^(\d+)\s+of\s+\d+/);
  return match ? Number(match[1]) : null;
}
