/**
 * Process rules decided by the community in the 16 November 2026 ballot (results published 23 November):
 * question 2, correction window 48 hours (18 of 24); question 3, voting period 72 hours (21 of 24).
 * Sessions held from 23 November on use these. The 16 November session itself ran a 24-hour review.
 */
export const REVIEW_WINDOW_HOURS = 48;
export const VOTING_PERIOD_HOURS = 72;

/**
 * Council screening (host's rule for the pilot, 24 Nov 2026; not yet voted on): no objection. Each draft question
 * goes to the ballot unless a council member objects in writing, with a reason, within SCREENING_HOURS of the review
 * closing. A question with an objection is held back, edited or split, with the written reason published. If the
 * council does not act in time, the question goes to the ballot as drafted.
 */
export const SCREENING_HOURS = 24;
export const SCREENING_RULE = `no objection: a question goes to the ballot unless a council member objects in writing within ${SCREENING_HOURS} hours`;
