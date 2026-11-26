import type { BallotDefinition } from '@/lib/ballots/ballot-core';
import { BALLOT_2026_11_16 } from '@/data/sessions/2026-11-16-ballot';
import { BALLOT_2026_11_23 } from '@/data/sessions/2026-11-23-ballot';

/** Session ballots by slug (the occurrence page's slug). Add one when a new occurrence page gets a ballot. */
export const SESSION_BALLOTS: Readonly<Record<string, BallotDefinition>> = {
  [BALLOT_2026_11_16.slug]: BALLOT_2026_11_16,
  [BALLOT_2026_11_23.slug]: BALLOT_2026_11_23,
};
