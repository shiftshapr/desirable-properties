import type { BroadcastCohortKey } from '@/data/dp-broadcast-cohorts';
import {
  cohortDisplayNameForEmail,
  cohortEmailsForKey,
  cohortRecipientKeyForEmail,
  normalizeBroadcastEmail,
} from '@/data/dp-broadcast-cohorts';

export type CohortRecipientBase = {
  key: string;
  userId: string | null;
  userName: string | null;
  email: string | null;
  workgroups: string[];
  hasSubmittedPatch?: boolean;
  patchCount?: number;
  patchDpIds?: string[];
};

export type CohortRecipientRow = CohortRecipientBase & {
  cohortOnly?: boolean;
  cohortSource?: BroadcastCohortKey;
};

function syntheticCohortRow(email: string, cohort: BroadcastCohortKey): CohortRecipientRow {
  const normalized = normalizeBroadcastEmail(email);
  const displayName = cohortDisplayNameForEmail(cohort, normalized);
  return {
    key: cohortRecipientKeyForEmail(normalized),
    userId: null,
    userName: displayName,
    email: normalized,
    workgroups: [],
    cohortOnly: true,
    cohortSource: cohort,
  };
}

/**
 * Apply cohort email filter to DP challenge audience rows.
 * For email-based cohorts, include matched participants plus external-only addresses.
 */
export function applyBroadcastCohortFilter(
  audience: CohortRecipientBase[],
  cohort: BroadcastCohortKey,
): CohortRecipientRow[] {
  if (cohort === 'all' || cohort === 'dp_challenge') {
    return audience.map((row) => ({ ...row, cohortOnly: false }));
  }

  const cohortEmails = cohortEmailsForKey(cohort);
  if (cohort === 'cfi1_zoom' && cohortEmails.length === 0) {
    return [];
  }

  const emailSet = new Set(cohortEmails.map(normalizeBroadcastEmail));
  const matched: CohortRecipientRow[] = [];
  const matchedEmails = new Set<string>();

  for (const row of audience) {
    const email = normalizeBroadcastEmail(row.email);
    if (!email || !emailSet.has(email)) continue;
    matched.push({ ...row, cohortOnly: false, cohortSource: cohort });
    matchedEmails.add(email);
  }

  for (const email of cohortEmails) {
    const normalized = normalizeBroadcastEmail(email);
    if (!normalized.includes('@') || matchedEmails.has(normalized)) continue;
    matched.push(syntheticCohortRow(normalized, cohort));
  }

  return matched.sort((a, b) => {
    const aName = (a.userName || a.email || a.key).toLowerCase();
    const bName = (b.userName || b.email || b.key).toLowerCase();
    return aName.localeCompare(bName);
  });
}

export function resolveBroadcastRecipientRow(
  key: string,
  audience: CohortRecipientBase[],
): CohortRecipientBase | null {
  const direct = audience.find((row) => row.key === key);
  if (direct) return direct;

  if (key.startsWith('cohort:')) {
    const email = key.slice('cohort:'.length).trim();
    if (!email.includes('@')) return null;
    const normalized = normalizeBroadcastEmail(email);
    const matched = audience.find((row) => normalizeBroadcastEmail(row.email) === normalized);
    if (matched) return matched;
  return {
    key,
    userId: null,
    userName: email,
    email: normalized,
    workgroups: [],
  };
  }

  return null;
}
