/**
 * Meeting-specific labels for session pages. Every heading that belongs to one meeting carries its date and its
 * specific title, so a reader always knows which meeting a transcript, draft or ballot belongs to (usability
 * walk-through of 20 Nov 2026, items 6, 9 to 12).
 *
 * A session has two names:
 * - `meetingTitle`: what this meeting was about ("Meeting agreements: how we decide"). Shown as the page title.
 * - `seriesTitle`: the series it belongs to ("DP Meta-Governance: Creating a Living Book Together").
 */
export type MeetingRef = {
  /** Calendar date of the meeting, yyyy-mm-dd (Pacific). */
  date: string;
  meetingTitle: string;
  seriesTitle: string;
};

function atNoonUtc(date: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`session-labels: expected yyyy-mm-dd, got ${date}`);
  return new Date(`${date}T12:00:00Z`);
}

/** "16 Nov 2026" */
export function meetingShortDate(date: string): string {
  return atNoonUtc(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** "Monday 16 Nov 2026" */
export function meetingLongDate(date: string): string {
  const d = atNoonUtc(date);
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' });
  return `${weekday} ${meetingShortDate(date)}`;
}

/** "Monday 16 Nov 2026, Meeting agreements: how we decide" */
export function meetingLabel(m: MeetingRef): string {
  return `${meetingLongDate(m.date)}, ${m.meetingTitle}`;
}

/** Headings for the sections of a session page, labelled with the meeting. */
export function sessionSectionLabels(m: MeetingRef) {
  const short = meetingShortDate(m.date);
  return {
    vote: `Vote on the ${short} ballot`,
    rules: 'Rules for this ballot',
    draft: `Meeting draft: ${short}, ${m.meetingTitle}, for review`,
    origins: 'Origins of the voting questions',
    draftBallot: `Draft ballot questions from the ${short} meeting (${m.meetingTitle})`,
    processText: 'How this meeting changed the process page',
    summary: `Meeting summary: ${short}, ${m.meetingTitle}`,
    decisions: 'Decisions coming up',
    openQuestions: 'Open questions',
    transcript: `Transcript: ${meetingLabel(m)}`,
    chat: `Session chat: ${short}`,
    ask: `Ask Deepi about the ${short} meeting`,
  };
}
