import type { BallotDefinition, BallotQuestion } from '@/lib/ballots/ballot-core';

/**
 * Ballot of the 16 Nov 2026 listening session: ~/handoff/dp-2026-11-16-governance-review/ballot-v2.md (questions,
 * options and bootstrap rules, verbatim). Context lines are the draft's (src/data/sessions/2026-11-16-draft.json).
 * Question and option keys are stored with each vote: never change a key once the ballot has opened.
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
    kind: 'yes_no',
    context: 'the host proposed trying a weekly listen, draft, verify, screen and vote cycle.',
    question:
      'Should the community run the weekly listen, draft, verify, screen and vote cycle as a four-session pilot and evaluate it afterward?',
    options: YES_NO,
  },
  {
    key: 'q2',
    n: 2,
    kind: 'choice',
    context: 'participants are asked to check draft ballots before screening.',
    question: 'How long should the correction window be?',
    options: choice(['24 hours, with a notice email about 12 hours before it opens', '48 hours']),
  },
  {
    key: 'q3',
    n: 3,
    kind: 'choice',
    context: 'the host suggested 48 or 72 hours for voting.',
    question: 'How long should a voting period last?',
    options: choice(['48 hours', '72 hours']),
  },
  {
    key: 'q4',
    n: 4,
    kind: 'choice',
    context: 'four approaches came up for passing a community ballot.',
    question: 'Which approval rule should community ballots use?',
    options: choice([
      'More than 50%',
      '60%',
      '67%',
      'Two tiers: 50% keeps the item open for review, 60% or more passes it',
      'Consent: an item passes unless someone raises a reasoned objection; if an objection cannot be resolved, seek full agreement; any decision can be reopened later',
    ]),
  },
  {
    key: 'q5',
    n: 5,
    kind: 'choice',
    context: 'no one knows yet how many people will vote.',
    question: 'What quorum should apply during the pilot?',
    options: choice(['No quorum', 'A fixed minimum of 20 votes', '10% of the voting body', '25% of the voting body']),
  },
  {
    key: 'q6',
    n: 6,
    kind: 'choice',
    context: 'the site now allows three co-editors per DP; the Version 1.0 text says two.',
    question: 'Which co-editor arrangement should apply?',
    options: choice([
      'Up to 3 seats, 2 approvals needed (the current site setup)',
      '2 seats, both approvals needed (the Version 1.0 text)',
    ]),
  },
  {
    key: 'q7',
    n: 7,
    kind: 'choice',
    context: 'today a decline must carry a rationale.',
    question: 'What should happen when one co-editor declines?',
    options: choice([
      'Keep the current rule: the decline carries a note, and two approvals can overrule it',
      'One decline ends the proposal',
      'A decline sends the proposal to further review',
    ]),
  },
  {
    key: 'q8',
    n: 8,
    kind: 'choice',
    context: 'title changes affect how readers find and cite a chapter.',
    question: 'Who should approve a chapter title change?',
    options: choice([
      'The steering committee, or the council once one exists',
      "75% of the chapter's authors and co-editors, then the steering committee or council",
      'A full community vote',
    ]),
  },
  {
    key: 'q9',
    n: 9,
    kind: 'yes_no',
    context: 'the council would screen ballots for readiness, not decide them.',
    question: 'Should the community elect a council to screen ballots for readiness (not to decide them)?',
    options: YES_NO,
  },
  {
    key: 'q10',
    n: 10,
    kind: 'yes_no',
    label: 'Proposal added after the meeting',
    context: 'Daveed Benjamin proposed an interim council after the meeting, to act now and prepare elections.',
    question:
      'Should an interim council of Daveed Benjamin, Leandra Preston, Michelle Thuo, Phahsa and Renad Baomar serve until a council is elected, and prepare the elections?',
    options: YES_NO,
  },
  {
    key: 'q11',
    n: 11,
    kind: 'choice',
    context: 'five, seven and nine members were mentioned.',
    question: 'If a council is elected, how many members should it have?',
    options: choice(['5', '7', '9']),
  },
  {
    key: 'q12',
    n: 12,
    kind: 'choice',
    context: 'the council could serve Desirable Properties alone or the wider Meta-Layer.',
    question: 'If a council is elected, what should its scope be?',
    options: choice([
      'The Desirable Properties only',
      'The Desirable Properties and the wider Meta-Layer Initiative, including Metaweb Academy',
    ]),
  },
  {
    key: 'q13',
    n: 13,
    kind: 'yes_no',
    context:
      'the host suggested publishing screening criteria and giving reasons when an item does not reach the ballot.',
    question: 'Should council screening use published criteria, with written reasons for every item held back?',
    options: YES_NO,
  },
  {
    key: 'q14',
    n: 14,
    kind: 'yes_no',
    context: 'the host suggested an agreement that sets out co-editor commitments.',
    question: 'Should new co-editors sign a co-editor agreement?',
    options: YES_NO,
  },
  {
    key: 'q15',
    n: 15,
    kind: 'choice',
    context: 'anyone with an account at least 7 days old can currently claim a seat.',
    question: 'How should new co-editors be vetted?',
    options: choice([
      'No vetting beyond account age',
      'A questionnaire that is published but not screened',
      'A questionnaire screened against published criteria',
    ]),
  },
];

export const BALLOT_2026_11_16: BallotDefinition = {
  slug: 'meta-governance-2026-11-16',
  title: 'Ballot: DP Meta-Governance, 16 November 2026',
  pagePath: '/events/meta-governance-2026-11-16',
  // Thu 19 Nov 2026, 12:00 PM PT: already past when this ships, so voting opens on each site when the code deploys
  // there (staging on merge to staging; production only when the owner releases to main).
  opensAt: '2026-11-19T20:00:00.000Z',
  // Sun 22 Nov 2026, 8:00 PM PT.
  closesAt: '2026-11-23T04:00:00.000Z',
  voterBody: 'Anyone signed in to desirableproperties.org can vote, one vote per account.',
  rules: [
    'Who votes: anyone with a signed-in account on desirableproperties.org, one vote per account.',
    'Passing: the option with the most votes; for Yes/No, more Yes than No. Abstain is counted but does not decide. No quorum.',
    'Multiple-choice questions: pick one option.',
    'You can change your votes until the ballot closes.',
    'Results are published on this page after the close.',
    'These are bootstrap rules for this first ballot; the ballot itself decides the rules for future ones.',
  ],
  questions: QUESTIONS,
};
