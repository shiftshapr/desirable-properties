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

/**
 * The session's week: the meeting day and the six days after it, when the review, the screening and the vote run.
 * A session page shows this span, not the meeting's date: the meeting happened on one day, the session is the week
 * (owner, 27 Nov 2026). "November 23–29"; with `year`, "November 23–29, 2026". A week that crosses a month reads
 * "November 30 – December 6", and one that crosses a year always carries both years.
 */
export function sessionWeekLabel(date: string, opts: { year?: boolean } = {}): string {
  const start = atNoonUtc(date);
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  const month = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
  const [y1, y2] = [start.getUTCFullYear(), end.getUTCFullYear()];
  if (y1 !== y2) return `${month(start)} ${start.getUTCDate()}, ${y1} – ${month(end)} ${end.getUTCDate()}, ${y2}`;
  const span =
    start.getUTCMonth() === end.getUTCMonth()
      ? `${month(start)} ${start.getUTCDate()}–${end.getUTCDate()}`
      : `${month(start)} ${start.getUTCDate()} – ${month(end)} ${end.getUTCDate()}`;
  return opts.year ? `${span}, ${y1}` : span;
}

/** "Monday 16 Nov 2026, Meeting agreements: how we decide" */
export function meetingLabel(m: MeetingRef): string {
  return `${meetingLongDate(m.date)}, ${m.meetingTitle}`;
}

/**
 * Headings for the sections of a session page. What belongs to the session (the vote, the chat) is labelled with
 * the session's week; what belongs to the meeting (draft, summary, transcript) with the meeting's date and title.
 */
export function sessionSectionLabels(m: MeetingRef) {
  const short = meetingShortDate(m.date);
  const week = sessionWeekLabel(m.date);
  return {
    vote: `Vote on the ${week} ballot`,
    rules: 'Rules for this ballot',
    draft: `Meeting draft: ${short}, ${m.meetingTitle}, for review`,
    origins: 'Origins of the voting questions',
    draftBallot: `Draft ballot questions from the ${short} meeting (${m.meetingTitle})`,
    processText: 'How this meeting changed the process page',
    summary: `Meeting summary: ${short}, ${m.meetingTitle}`,
    decisions: 'Decisions coming up',
    openQuestions: 'Open questions',
    transcript: `Transcript: ${meetingLabel(m)}`,
    chat: `Session chat: ${week}`,
    ask: `Ask Deepi about the ${short} meeting`,
  };
}
