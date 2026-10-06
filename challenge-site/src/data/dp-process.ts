/**
 * Principles, protocols, roles, practices and the V1 readiness checklist for the
 * DP workgroups through Version 1.0 (13 November 2026). Shared by /process,
 * /v1-readiness, the roundup pages and the Blueberries seed.
 *
 * Source: "DP Workgroups: Principles, Protocols & Practices to Nov 13 (V1)".
 * Two items are still proposed, pending the Monday session: the last day a new
 * proposal can enter V1 (19 October) and the 7-day agenda rule.
 */

export const V1_RELEASE_DATE = '2026-11-13';
export const V1_FREEZE_LABEL = 'Monday 9 November, 1 p.m. PT';
export const PROPOSAL_CUTOFF_DATE = '2026-10-19';
export const STALE_PROPOSAL_DAYS = 7;
export const CO_EDITORS_PER_DP = 2;
export const MIN_WORKGROUP_MEMBERS = 3;

export const PROCESS_PRINCIPLES: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: 'Synthesis, not stacking',
    body: 'A chapter integrates ideas once, in their best home. Overlapping proposals are reconciled into one passage. Restating the same point in several places weakens the book.',
  },
  {
    title: 'Every contribution is traceable',
    body: 'Each change keeps its contributors’ names and its source (Canopi post, Gov Hub proposal, CFI submission). Reconciled text credits everyone it draws on.',
  },
  {
    title: 'Anchored to text',
    body: 'Proposals point at a specific passage and say exactly what changes. A general comment becomes a proposal only when someone writes the wording.',
  },
  {
    title: 'Decisions carry reasons',
    body: 'Every merge, decline or “considered” carries a review note. A contributor can always see why their proposal went the way it did.',
  },
  {
    title: 'Two people agree before the book changes',
    body: 'No single person, including coordinators and admins, incorporates a proposal into a DP alone.',
  },
  {
    title: 'AI assists; people decide',
    body: 'Deepi, Hermes and Astra draft, reconcile and check. A person approves every change, and AI-drafted text is labelled as such.',
  },
  {
    title: 'Normative and testable',
    body: 'Requirements use MUST, SHOULD and MAY deliberately. A requirement that cannot be checked becomes guidance, not a MUST. Version 1.0 feeds the ML-REQs in December.',
  },
];

export const PROCESS_PROTOCOL: ReadonlyArray<{ title: string; body: string; proposed?: boolean }> = [
  {
    title: 'Propose on the book',
    body: 'Use Discuss, Patch or Insert on book.desirableproperties.org, selecting the exact passage. Gov Hub’s own patch form works too.',
  },
  {
    title: 'Filing is automatic',
    body: 'Every 30 minutes, Canopi patches and inserts are filed into Gov Hub as pending proposals under their authors. Posts already decided by an Astra pass, and Astra’s own reconciled posts, are not filed again.',
  },
  {
    title: 'Astra passes reconcile batches',
    body: 'Input that arrives in bulk (Calls for Input, a week of Discuss) is run through Astra. Astra produces one reconciled change per idea, credits every source, and posts it to Canopi once.',
  },
  {
    title: 'Two co-editors decide',
    body: 'A proposal is incorporated when both co-editors approve it. Either co-editor, or the coordinator, can decline it or mark it considered. Every decision carries a review note.',
  },
  {
    title: 'Nothing waits silently',
    body: `A proposal still pending after ${STALE_PROPOSAL_DAYS} days goes on the next Monday session’s agenda.`,
    proposed: true,
  },
  {
    title: 'Publish as a numbered revision',
    body: 'The coordinator or a co-editor publishes the working revision as the next ML-Draft. The book’s live chapter follows it.',
  },
  {
    title: 'Freeze',
    body: `After ${V1_FREEZE_LABEL}, only corrections and acknowledgments verified at the Final Review change.`,
  },
];

export const PROCESS_ROLES: ReadonlyArray<{
  role: string;
  count: string;
  decides: string;
  howToGetIt: string;
}> = [
  {
    role: 'Member',
    count: `${MIN_WORKGROUP_MEMBERS} or more`,
    decides: 'Proposes, comments, reviews, takes practice tasks',
    howToGetIt: 'Join the workgroup',
  },
  {
    role: 'Co-editor',
    count: `Exactly ${CO_EDITORS_PER_DP}`,
    decides: 'Approves (both needed) or declines proposals; publishes revisions',
    howToGetIt: 'Claim an open seat on the workgroup page',
  },
  {
    role: 'Coordinator',
    count: '1',
    decides: 'Runs the weekly rhythm, declines or marks considered, publishes revisions; cannot incorporate alone',
    howToGetIt: 'Nomination, approved by a layer admin',
  },
];

export const CO_EDITOR_CLAIM_RULE =
  'Any signed-in person whose account is at least 7 days old can claim an open seat with a short statement, for at most 2 DPs. The claim takes effect at once and is announced to the coordinator and admins. The coordinator can revoke it within 7 days, and a super admin at any time, always with a reason. A revoked co-editor’s pending approvals stop counting.';

export type PracticeTask = {
  id: string;
  task: string;
  who: 'Any member' | 'Members' | 'Co-editors' | 'Coordinator' | 'Coordinator and co-editors';
  /** ISO Mondays this task belongs to. */
  weeks: string[];
  doneWhen: string;
  minutes: number;
};

export const PRACTICE_TASKS: ReadonlyArray<PracticeTask> = [
  {
    id: 'comments-to-proposals',
    task: 'Turn three Discuss comments on your chapter into Patch or Insert proposals with exact wording',
    who: 'Any member',
    weeks: ['2026-10-05'],
    doneWhen: 'Each is filed in Gov Hub with your name',
    minutes: 60,
  },
  {
    id: 'review-two-proposals',
    task: 'Review two pending proposals and add a reasoned comment',
    who: 'Any member',
    weeks: ['2026-10-05'],
    doneWhen: 'Each has a comment co-editors can act on',
    minutes: 30,
  },
  {
    id: 'claim-co-editor',
    task: 'Claim a co-editor seat, or invite someone who should hold it',
    who: 'Members',
    weeks: ['2026-10-05', '2026-10-12'],
    doneWhen: 'Both seats filled',
    minutes: 15,
  },
  {
    id: 'find-evidence',
    task: 'Find a source or example for one claim marked as needing evidence',
    who: 'Any member',
    weeks: ['2026-10-12'],
    doneWhen: 'Link added to the proposal or chapter',
    minutes: 45,
  },
  {
    id: 'compromise-wording',
    task: 'Write the compromise wording where two proposals conflict',
    who: 'Any member',
    weeks: ['2026-10-12'],
    doneWhen: 'One proposal replaces both; the others are declined with notes',
    minutes: 60,
  },
  {
    id: 'decide-pending',
    task: 'Approve or decline every pending proposal with a note',
    who: 'Co-editors',
    weeks: ['2026-10-12', '2026-10-19'],
    doneWhen: `No proposal pending for more than ${STALE_PROPOSAL_DAYS} days`,
    minutes: 60,
  },
  {
    id: 'read-through',
    task: 'Read the chapter end to end after integration and flag breaks',
    who: 'Any member',
    weeks: ['2026-10-19'],
    doneWhen: 'Issues filed as patches',
    minutes: 45,
  },
  {
    id: 'cross-dp-terms',
    task: 'Check terms against the neighbouring DPs and the glossary',
    who: 'Any member',
    weeks: ['2026-10-26'],
    doneWhen: 'Conflicts filed with both chapters named',
    minutes: 45,
  },
  {
    id: 'acknowledgments',
    task: 'Confirm contributor acknowledgments for the chapter',
    who: 'Coordinator',
    weeks: ['2026-11-02'],
    doneWhen: 'Every contributor is credited',
    minutes: 30,
  },
  {
    id: 'run-checklist',
    task: 'Run the readiness checklist and list release blockers',
    who: 'Coordinator and co-editors',
    weeks: ['2026-11-02'],
    doneWhen: 'Blockers named on the workgroup page',
    minutes: 45,
  },
  {
    id: 'verify-corrections',
    task: 'Verify final corrections before the freeze',
    who: 'Co-editors',
    weeks: ['2026-11-09'],
    doneWhen: 'Chapter published as the V1 candidate revision',
    minutes: 45,
  },
];

export type ReadinessItem = {
  key: string;
  label: string;
  check: 'auto' | 'manual' | 'external';
  due: string;
};

export const READINESS_ITEMS: ReadonlyArray<ReadinessItem> = [
  { key: 'members', label: `Workgroup has at least ${MIN_WORKGROUP_MEMBERS} members`, check: 'auto', due: '2026-10-12' },
  { key: 'co_editors', label: 'Both co-editor seats filled', check: 'auto', due: '2026-10-12' },
  { key: 'coordinator', label: 'Coordinator in place', check: 'auto', due: '2026-10-12' },
  { key: 'canopi_filed', label: 'Every Canopi patch and insert on the chapter is filed in Gov Hub or decided by Astra', check: 'external', due: '2026-10-19' },
  { key: 'no_stale_proposals', label: `No proposal pending longer than ${STALE_PROPOSAL_DAYS} days`, check: 'auto', due: '2026-10-26' },
  { key: 'review_notes', label: 'Every declined or considered proposal has a review note', check: 'auto', due: '2026-10-26' },
  { key: 'revision_published', label: 'Integrated changes published as a numbered ML-Draft revision', check: 'auto', due: '2026-11-02' },
  { key: 'cross_dp_check', label: 'Chapter checked against neighbouring DPs for terms, overlaps and conflicts', check: 'manual', due: '2026-10-26' },
  { key: 'testable_musts', label: 'Every MUST and SHOULD is testable or rephrased as guidance', check: 'manual', due: '2026-11-02' },
  { key: 'acknowledgments', label: 'All contributors acknowledged', check: 'manual', due: '2026-11-02' },
  { key: 'no_blockers', label: 'No release blockers open from the readiness review', check: 'manual', due: '2026-11-09' },
  { key: 'v1_candidate', label: 'V1 candidate revision published before the freeze', check: 'auto', due: '2026-11-09' },
];

export function tasksForWeek(mondayIso: string): PracticeTask[] {
  return PRACTICE_TASKS.filter((t) => t.weeks.includes(mondayIso));
}

export function shortDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
