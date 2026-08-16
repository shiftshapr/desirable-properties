/**
 * Broadcast cohort email lists for targeted outreach.
 * Sources: meta-console/docs/PCI-META-LAYER-HISTORY.md (First Call for Input table),
 * mail-exports/daveed/submissions-participants.txt (CFI#2),
 * src/data/isoc-nevada-members.json (ISOC Nevada chapter).
 */

import isocNevadaMembersJson from '@/data/isoc-nevada-members.json';

export type BroadcastCohortKey =
  | 'all'
  | 'cfi1_pci'
  | 'cfi1_zoom'
  | 'cfi2_submitters'
  | 'isoc_nevada'
  | 'dp_challenge';

export type BroadcastCohortMember = {
  name: string;
  email: string;
};

export type BroadcastCohortConfig = {
  key: BroadcastCohortKey;
  label: string;
  description?: string;
  emails: string[];
  members?: BroadcastCohortMember[];
};

/** First CFI — PCI participants (24 addresses from PCI history doc table). */
export const CFI1_PCI_EMAILS: string[] = [
  'kevin@peoplecentered.net',
  'ce@contentevolution.net',
  'kevin.clark@choiceflows.com',
  'vint@google.com',
  'vgcerf@gmail.com',
  'mlfung@gmail.com',
  'mlf@alum.mit.edu',
  'jascha.stein@peoplecentered.net',
  'doug.hohulin@gmail.com',
  'iambgcloud@gmail.com',
  'ibdengineering@yahoo.com',
  'stu@texifter.com',
  'cmason@cmason.us',
  'richard.boyd@ultisim.com',
  'whbutler@captechu.edu',
  'jackpark@topicquests.org',
  'dpeyre@gmail.com',
  'david.a.bray@gmail.com',
  'david@i4j.info',
  'ron@communityagents.ai',
  'guido@iiij.org',
  'sfghoagland@gmail.com',
  'drsincavage@idiqinc.us',
  'billdaul@gmail.com',
];

/** CFI#1 ZOOM attendee list — placeholder until curated. */
export const CFI1_ZOOM_EMAILS: string[] = [];

/** Second CFI submitters (18 emails from submissions-participants.txt). */
export const CFI2_SUBMITTER_EMAILS: string[] = [
  'alex.nassarius@gmail.com',
  'bdegraf@gmail.com',
  'eric@jpberlin.de',
  'jamagax@gmail.com',
  'langchri@gmail.com',
  'lindsayjanecontent@proton.me',
  'lizsweig@gmail.com',
  'mentallyhyp2012@gmail.com',
  'michaelwitmore@gmail.com',
  'phahsa@protonmail.com',
  'rubenraul75@gmail.com',
  'sandeepchakravartty@gmail.com',
  'scottfrankum@gmail.com',
  'sfghoagland@gmail.com',
  'taiconan@gmail.com',
  'thuomichelle2020@gmail.com',
  'webbie@theartisanhub.org',
  'wojakk3336@gmail.com',
];

export function normalizeBroadcastEmail(email: string | null | undefined): string {
  return String(email || '')
    .trim()
    .toLowerCase();
}

const ISOC_NEVADA_MEMBERS: BroadcastCohortMember[] = (
  isocNevadaMembersJson as { members?: BroadcastCohortMember[] }
).members?.map((row) => ({
  name: String(row.name || '').trim(),
  email: normalizeBroadcastEmail(row.email),
}))?.filter((row) => row.email.includes('@')) || [];

export const ISOC_NEVADA_EMAILS: string[] = ISOC_NEVADA_MEMBERS.map((row) => row.email);

export const BROADCAST_COHORTS: BroadcastCohortConfig[] = [
  {
    key: 'all',
    label: 'All',
    description: 'All DP challenge participants (no cohort email filter).',
    emails: [],
  },
  {
    key: 'cfi1_pci',
    label: 'CFI#1 PCI Emails',
    description: 'First Call for Input — PCI community participants.',
    emails: CFI1_PCI_EMAILS,
  },
  {
    key: 'cfi1_zoom',
    label: 'CFI#1 ZOOM',
    description: 'Sept 16 2024 kickoff ZOOM attendees (list TBD).',
    emails: CFI1_ZOOM_EMAILS,
  },
  {
    key: 'cfi2_submitters',
    label: 'CFI#2 Submitters',
    description: 'Second Call for Input form submitters.',
    emails: CFI2_SUBMITTER_EMAILS,
  },
  {
    key: 'isoc_nevada',
    label: 'ISOC Nevada',
    description: 'Internet Society Nevada Chapter founding members and core roster.',
    emails: ISOC_NEVADA_EMAILS,
    members: ISOC_NEVADA_MEMBERS,
  },
  {
    key: 'dp_challenge',
    label: 'DP Challenge',
    description: 'Current Desirable Properties challenge workgroup participants.',
    emails: [],
  },
];

export function cohortEmailsForKey(cohort: BroadcastCohortKey): string[] {
  const entry = BROADCAST_COHORTS.find((c) => c.key === cohort);
  return entry?.emails || [];
}

export function cohortMembersForKey(cohort: BroadcastCohortKey): BroadcastCohortMember[] {
  const entry = BROADCAST_COHORTS.find((c) => c.key === cohort);
  if (!entry?.members?.length) {
    return cohortEmailsForKey(cohort).map((email) => ({ name: email, email }));
  }
  return entry.members;
}

export function cohortDisplayNameForEmail(cohort: BroadcastCohortKey, email: string): string {
  const normalized = normalizeBroadcastEmail(email);
  const member = cohortMembersForKey(cohort).find((row) => row.email === normalized);
  return member?.name?.trim() || normalized;
}

export function cohortLabelForKey(cohort: BroadcastCohortKey): string {
  return BROADCAST_COHORTS.find((c) => c.key === cohort)?.label || cohort;
}

export function cohortUsesDpChallengeFilters(cohort: BroadcastCohortKey): boolean {
  return cohort === 'dp_challenge';
}

export function cohortRecipientKeyForEmail(email: string): string {
  return `cohort:${normalizeBroadcastEmail(email)}`;
}

export function isCohortRecipientKey(key: string): boolean {
  return key.startsWith('cohort:');
}

export function emailFromCohortRecipientKey(key: string): string | null {
  if (!isCohortRecipientKey(key)) return null;
  const email = key.slice('cohort:'.length).trim();
  return email.includes('@') ? email : null;
}
