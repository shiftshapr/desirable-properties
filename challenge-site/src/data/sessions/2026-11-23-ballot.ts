import type { BallotDefinition, BallotQuestion } from '@/lib/ballots/ballot-core';

/**
 * Ballot of the 23 Nov 2026 listening session (page /events/listening-2026-11-23). Questions, options and context
 * notes are the draft ballot's, verbatim (src/data/sessions/2026-11-23-draft.json, `ballot.questions`, including the
 * host's 25 Nov correction of the question 1 note); scripts/ballot-2026-11-23.test.mjs checks they match.
 * Question and option keys are stored with each vote: never change a key once the ballot has opened.
 *
 * Opening follows the voted process with no release at the close: voting opens when council screening closes
 * (Thu 26 Nov 8:00 PM PT), with only the questions that had no standing objection then (screenedBy); held-back
 * questions are shown with the objections and are not votable. It runs VOTING_PERIOD_HOURS (72, voted 16 Nov).
 * The times are literals so plain Node scripts can load this file; the tests check them against the screening
 * definition (SCREENING_2026_11_23.closesAt) and session-rules.ts.
 * The ballot is registered with the vote store (Gov Hub) on first use after the close, never before, so the
 * questions it holds are the final screening outcome (ballot-store.server.ts).
 */

const YES_NO = [
  { key: 'yes', label: 'Yes' },
  { key: 'no', label: 'No' },
  { key: 'abstain', label: 'Abstain' },
];

const choice = (labels: string[]) => [
  ...labels.map((label, i) => ({ key: String.fromCharCode(97 + i), label })),
  { key: 'abstain', label: 'Abstain' },
];

const QUESTIONS: BallotQuestion[] = [
  {
    key: 'q1',
    n: 1,
    kind: 'choice',
    context: "question 5 of the 16 November ballot tied 6 to 6 between a minimum of 20 votes and 25% of the voting body. Added by the host on 24 November, as asked in the meeting, and corrected on 25 November: the voting body is the 76 people the session emails go to (contributors, co-editors and people who signed up), so 25% of the voting body is 19 votes. The active voting body is smaller: the people who have voted in a ballot or taken part in a session during the pilot. As of 25 November that is 28 people (the 24 who voted on the 16 November ballot, and 4 more who spoke in the 23 November session), so 25% of the active voting body is 7 votes. Both numbers grow as more people join. The 16 November ballot had 24 voters, so it would have cleared either 25% quorum.",
    correction: "Corrected by the host on 25 November, after the review closed: the earlier note gave the size of the voting body (76 people, 19 votes) as the size of the active voting body. The active voting body has now been counted separately.",
    question: "What quorum should apply to ballots during the four-session pilot?",
    options: choice(["No quorum", "A minimum of 20 votes", "25% of the voting body", "25% of the active voting body"]),
  },
  {
    key: 'q2',
    n: 2,
    kind: 'yes_no',
    context: "today any option raised in a session can go into the draft ballot.",
    question: "Should an option need a second from another participant before it goes into the draft ballot?",
    options: YES_NO,
  },
  {
    key: 'q3',
    n: 3,
    kind: 'yes_no',
    context: "Markabadi suggested plain English before formal wording.",
    question: "Should draft ballot options be written in plain English first, before formal wording?",
    options: YES_NO,
  },
  {
    key: 'q4',
    n: 4,
    kind: 'yes_no',
    context: "Markabadi suggested a short check-in near the start of each session.",
    question: "Should each session open with an optional 30-second check-in?",
    options: YES_NO,
  },
  {
    key: 'q5',
    n: 5,
    kind: 'yes_no',
    context: "Markabadi suggested one major inquiry per session.",
    question: "Should each session focus on one major inquiry?",
    options: YES_NO,
  },
  {
    key: 'q6',
    n: 6,
    kind: 'yes_no',
    context: "Markabadi suggested the AI assistant raise its hand when it has something to add.",
    question: "Should Deepi, the meeting assistant, raise its hand when it notices something to add?",
    options: YES_NO,
  },
  {
    key: 'q7',
    n: 7,
    kind: 'yes_no',
    context: "reminders would go out when review and voting open and close, three or four a week, skipping people who have already voted.",
    question: "Should the Desirable Properties offer opt-in text reminders?",
    options: YES_NO,
  },
  {
    key: 'q8',
    n: 8,
    kind: 'yes_no',
    context: "transcripts are corrected for 48 hours before any review or ballot begins.",
    question: "Should session transcripts be published on the session page and kept?",
    options: YES_NO,
  },
  {
    key: 'q9',
    n: 9,
    kind: 'choice',
    context: "the book club starts on 30 November with the front matter.",
    question: "After the front matter, how should the book club choose what to read?",
    options: choice(["In book order, from DP1 onward", "Chapters the group picks by interest or background"]),
  },
];

/** Thu 26 Nov 2026, 8:00 PM PT (27 Nov 04:00 UTC): the close of council screening (SCREENING_2026_11_23.closesAt). */
const OPENS_AT = '2026-11-27T04:00:00.000Z';
/** Sun 29 Nov 2026, 8:00 PM PT (30 Nov 04:00 UTC): VOTING_PERIOD_HOURS (72) later. */
const CLOSES_AT = '2026-11-30T04:00:00.000Z';

export const BALLOT_2026_11_23: BallotDefinition = {
  slug: 'listening-2026-11-23',
  title: 'Ballot: DP Listening Experiment 1/4, 23 November 2026',
  pagePath: '/events/listening-2026-11-23',
  opensAt: OPENS_AT,
  closesAt: CLOSES_AT,
  voterBody: 'Anyone signed in to desirableproperties.org can vote, one vote per account.',
  approval: 'two_tier',
  screenedBy: 'listening-2026-11-23',
  rules: [
    'Who votes: anyone with a signed-in account on desirableproperties.org, one vote per account.',
    'What is on the ballot: every draft question that had no standing objection from the interim council when screening closed (24 hours after the review). A question held back by the council is shown with the objections and reasons, and is not voted on.',
    'Yes/No questions use the approval rule chosen on the 16 November ballot: of the Yes and No votes, 60% or more Yes passes the question; 50% to under 60% keeps it open for review; under 50% does not pass.',
    'Multiple-choice questions: pick one option; the option with the most votes wins, as on the 16 November ballot.',
    'Abstain is counted but does not decide.',
    'Quorum: none for this ballot. The 16 November quorum question tied; question 1 asks what quorum should apply during the pilot.',
    'Voting lasts 72 hours, as chosen on the 16 November ballot. You can change your votes until the ballot closes.',
    'Results are published on this page after the close.',
  ],
  questions: QUESTIONS,
};
