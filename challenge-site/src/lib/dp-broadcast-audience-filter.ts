import { extractDpId } from '@/lib/govhub';

export type BroadcastPatchFilter = 'all' | 'submitted' | 'not_submitted';
export type BroadcastDpScope = 'all' | 'specific';

export type BroadcastAudienceFilterRow = {
  userId: string | null;
  workgroups: string[];
  hasSubmittedPatch?: boolean;
  patchDpIds?: string[];
};

export function rowMatchesDpScope(row: BroadcastAudienceFilterRow, dpId: string | null): boolean {
  if (!dpId) return true;
  return row.workgroups.some((name) => extractDpId(name) === dpId);
}

export function rowHasPatchForFilter(row: BroadcastAudienceFilterRow, dpId: string | null): boolean {
  if (!dpId) return Boolean(row.hasSubmittedPatch);
  return Boolean(row.patchDpIds?.includes(dpId));
}

export function broadcastAudienceMatchesFilters(
  row: BroadcastAudienceFilterRow,
  opts: {
    patchFilter?: BroadcastPatchFilter;
    dpScope?: BroadcastDpScope;
    dpId?: string | null;
  },
): boolean {
  const patchFilter = opts.patchFilter || 'all';
  const dpScope = opts.dpScope || 'all';
  const dpId = dpScope === 'specific' ? String(opts.dpId || '').trim().toUpperCase() || null : null;

  if (dpId && !rowMatchesDpScope(row, dpId)) return false;

  if (patchFilter === 'submitted' && !rowHasPatchForFilter(row, dpId)) return false;
  if (patchFilter === 'not_submitted' && rowHasPatchForFilter(row, dpId)) return false;

  return true;
}
