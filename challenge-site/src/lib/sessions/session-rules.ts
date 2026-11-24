/**
 * Process rules decided by the community in the 16 November 2026 ballot (results published 23 November):
 * question 2, correction window 48 hours (18 of 24); question 3, voting period 72 hours (21 of 24).
 * Sessions held from 23 November on use these. The 16 November session itself ran a 24-hour review.
 */
export const REVIEW_WINDOW_HOURS = 48;
export const VOTING_PERIOD_HOURS = 72;

/**
 * Council screening (host's rule for the pilot, 24 Nov 2026, inside the 16 Nov ballot's "published screening criteria,
 * and written reasons for anything held back"): no objection, per question. Each draft ballot question goes to the
 * ballot unless a member of the interim council objects to that question on the session page, with a reason, by
 * SCREENING_HOURS after the review closes. Objections are public, next to the question, with the member's name and
 * reason; never by email. A member may withdraw their own objection before the close (the record is kept). A question
 * with a standing objection at the close is held back, with the reasons listed. If the council does not act, every
 * question goes to the ballot as drafted. Mechanism: src/lib/screening/screening-core.ts.
 */
export const SCREENING_HOURS = 24;
export const SCREENING_RULE = `no objection, per question: each draft question goes to the ballot unless a council member objects to it on the session page, with a reason, within ${SCREENING_HOURS} hours of the review closing`;
