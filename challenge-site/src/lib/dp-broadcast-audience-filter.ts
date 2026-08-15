import type { BroadcastCohortKey } from '@/data/dp-broadcast-cohorts';
import { cohortUsesDpChallengeFilters, normalizeBroadcastEmail } from '@/data/dp-broadcast-cohorts';
import { extractDpId } from '@/lib/govhub';

export type BroadcastPatchFilter = 'all' | 'submitted' | 'not_submitted';
export type BroadcastDpScope = 'all' | 'specific';

export type BroadcastAudienceFilterOptions = {
  cohort?: BroadcastCohortKey;
  patchFilter?: BroadcastPatchFilter;
  dpScope?: BroadcastDpScope;
  dpId?: string | null;
};

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
  opts: BroadcastAudienceFilterOptions,
): boolean {
  const cohort = opts.cohort || 'all';
  const patchFilter = cohortUsesDpChallengeFilters(cohort) ? opts.patchFilter || 'all' : 'all';
  const dpScope = cohortUsesDpChallengeFilters(cohort) ? opts.dpScope || 'all' : 'all';
  const dpId = dpScope === 'specific' ? String(opts.dpId || '').trim().toUpperCase() || null : null;

  if (dpId && !rowMatchesDpScope(row, dpId)) return false;

  if (patchFilter === 'submitted' && !rowHasPatchForFilter(row, dpId)) return false;
  if (patchFilter === 'not_submitted' && rowHasPatchForFilter(row, dpId)) return false;

  return true;
}

export function rowMatchesCohortEmailList(
  row: { email?: string | null },
  cohortEmails: string[],
): boolean {
  if (!cohortEmails.length) return true;
  const email = normalizeBroadcastEmail(row.email);
  if (!email) return false;
  const set = new Set(cohortEmails.map(normalizeBroadcastEmail));
  return set.has(email);
}
