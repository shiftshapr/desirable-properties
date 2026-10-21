import { CO_EDITORS_PER_DP } from '@/data/dp-process';

/**
 * Co-editor line for a workgroup card. Only co-editor seats are shown; member counts are
 * not reported. coEditors is null when unknown (Gov Hub unreachable) or not applicable
 * (DP Discovery has no co-editors); the line is then empty.
 */
export type WorkgroupStaffing = {
  kind: 'recruit' | 'ready' | 'info';
  title: string;
  message: string;
};

export function workgroupStaffing({ coEditors }: { coEditors: number | null }): WorkgroupStaffing {
  if (coEditors === null) {
    return { kind: 'info', title: '', message: '' };
  }
  const open = Math.max(0, CO_EDITORS_PER_DP - coEditors);
  if (open > 0) {
    return {
      kind: 'recruit',
      title: `Co-editors: ${coEditors} of ${CO_EDITORS_PER_DP} · ${open} open seat${open === 1 ? '' : 's'}`,
      message: 'Co-editors decide which proposals go into Version 1.0; any member can step up.',
    };
  }
  return {
    kind: 'ready',
    title: `Co-editors: ${coEditors} of ${CO_EDITORS_PER_DP}`,
    message: 'Both co-editor seats are filled.',
  };
}

/** "1 of 2" (Gov Hub readiness detail) → 1; null if absent. */
export function coEditorCountFromDetail(detail: string | null | undefined): number | null {
  const match = String(detail || '').match(/^(\d+)\s+of\s+\d+/);
  return match ? Number(match[1]) : null;
}
