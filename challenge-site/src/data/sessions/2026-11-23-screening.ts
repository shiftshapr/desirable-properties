import draftData from '@/data/sessions/2026-11-23-draft.json';
import { SESSION_2026_11_23 as SESSION } from '@/data/sessions/2026-11-23';
import { screeningDefinition, type ScreeningDefinition } from '@/lib/screening/screening-core';
import { SCREENING_HOURS } from '@/lib/sessions/session-rules';

/**
 * Council screening of the 23 Nov draft ballot: objections from the draft going visible (review open, 24 Nov 04:00
 * UTC); the window runs from review close (26 Nov 04:00 UTC) for SCREENING_HOURS, to 27 Nov 04:00 UTC.
 */
const reviewClose = SESSION.phaseHistory.find((e) => e.phase === 'Community verification closed');
if (!SESSION.draftVisibleAt || !reviewClose) throw new Error('23 Nov session: draftVisibleAt and review close are required');

export const SCREENING_2026_11_23: ScreeningDefinition = screeningDefinition({
  slug: SESSION.slug,
  draftVisibleAt: SESSION.draftVisibleAt,
  reviewClosesAt: reviewClose.at,
  hours: SCREENING_HOURS,
  questions: (draftData as { ballot: { questions: Array<{ n: number; question: string }> } }).ballot.questions,
});

export const SESSION_SCREENINGS: Record<string, ScreeningDefinition> = {
  [SCREENING_2026_11_23.slug]: SCREENING_2026_11_23,
};
