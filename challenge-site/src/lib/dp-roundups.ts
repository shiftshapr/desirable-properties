/** Confirmed 2026 series schedule. November dates use PST after the DST change. */
export const DP_V1_LAUNCH_START = '2026-11-13T10:00:00-08:00';
export const DP_V1_LAUNCH_END = '2026-11-13T11:00:00-08:00';
export const DP_V1_FREEZE = '2026-11-09T13:00:00-08:00';
/** Monday DP Roundups only. Do not use this on the Friday V1 launch event. */
export const ROUNDUP_TIME_LABEL = '11:30 a.m.–1:00 p.m. Pacific Time';
/** Friday V1 launch gathering, long form. */
export const V1_LAUNCH_TIME_LABEL = '10:00 a.m.–11:00 a.m. Pacific Time';
/** Friday V1 launch gathering, short form. */
export const V1_LAUNCH_CLOCK_SHORT = '10–11 AM PT';

/** Meta-Governance gathering after the V1 launch, long form. */
export const META_GOVERNANCE_TIME_LABEL = '10:00–11:30 a.m. Pacific Time';
/** Meta-Governance gathering after the V1 launch, short form. */
export const META_GOVERNANCE_CLOCK_SHORT = '10–11:30 AM PT';

/**
 * - `roundup`: a Monday DP Roundup (11:30–1:00, roundup agenda, "DP Roundup:" title prefix).
 * - `launch`: the Friday V1 launch gathering.
 * - `gathering`: any other community session; it carries its own title and times.
 */
export type GatheringKind = 'roundup' | 'launch' | 'gathering';

type SessionInput = {
  kind: GatheringKind;
  date: string;
  focus: string;
  objective: string;
  lumaUrl: string;
  /** Required for `launch` and `gathering`; roundups default to 11:30–1:00 Pacific. */
  startsAt?: string;
  endsAt?: string;
  timeLabel?: string;
  clockShort?: string;
  /** Longer description for the event's own page. */
  details?: string;
  /** Site page with the recording, once there is one (replaces the Luma RSVP after the event). */
  recordingHref?: string;
  /** Community sessions: the session's own page (notes, draft for review, chat). See src/lib/current-session.ts. */
  pageHref?: string;
  /** Anchor on the session page for its chat, when the page has one. */
  chatAnchor?: string;
  /** One line on what the session page holds. */
  pageContents?: string;
  /** Community sessions: what this meeting is about ("Meeting agreements: how we decide"); `focus` is the series. */
  meetingTitle?: string;
  /** Community sessions: this meeting's own paragraph ("This week: …"), without the series description. */
  thisWeek?: string;
  /** Community sessions: the description shared by every session in the series. */
  seriesAbout?: string;
  /**
   * Community sessions: meeting pads (slugs, src/data/meeting-pads) whose "For the process" suggestions go on this
   * meeting's agenda, shown as "Raised between sessions". Only public pads are shown.
   */
  raisedBetweenSessions?: readonly string[];
};

const roundup = (date: string, focus: string, objective: string, lumaUrl: string): SessionInput =>
  ({ kind: 'roundup', date, focus, objective, lumaUrl });

/** Shared description of the four DP Listening Experiment sessions (Luma copy, without the Zoom link). */
const LISTENING_EXPERIMENT_SHARED = 'How do we keep improving a book that a whole community wrote? Version 1.0 of The Layered Web was written in the open by more than 70 contributors. In this four-week experiment we use Monday listening sessions to decide, together, how it grows. Everyone is welcome: contributors, co-editors, past DP Roundup participants and anyone curious. Bring an experience, a question or an option you think we should consider. Each session opens with a short update on last week\'s record and outcomes, then timed contributions, questions and options, and an open mic; we close by reading back the issues and the next steps. Afterwards Claude drafts a summary and a ballot from the transcript, you get 24 hours to correct it, and then the community votes. Register on Luma and the Zoom link comes to you.';

/** DP Listening Experiment n/4: Monday listening session, 10:00–11:30 a.m. Pacific on Zoom. */
const listeningExperiment = (n: number, date: string, lumaUrl: string, meetingTitle: string, objective: string, thisWeek: string): SessionInput => ({
  kind: 'gathering', date, focus: `DP Listening Experiment ${n}/4: Creating a Living Book Together`,
  meetingTitle, objective, lumaUrl,
  startsAt: `${date}T10:00:00-08:00`, endsAt: `${date}T11:30:00-08:00`,
  timeLabel: META_GOVERNANCE_TIME_LABEL, clockShort: META_GOVERNANCE_CLOCK_SHORT,
  details: `${thisWeek} ${LISTENING_EXPERIMENT_SHARED}`,
  thisWeek, seriesAbout: LISTENING_EXPERIMENT_SHARED,
});

const sessions: readonly SessionInput[] = [
  roundup('2026-09-28', 'Find Your Workgroup', 'Get direction, meet collaborators, and choose a first contribution.', 'https://luma.com/5fjbcp9l'),
  roundup('2026-10-05', 'Turn Feedback into Proposals', 'Turn chapter comments into specific proposals with owners and reviewers.', 'https://luma.com/9zl8o8n8'),
  roundup('2026-10-12', 'Resolve the Hard Questions', 'Address competing wording, missing evidence, and substantive objections.', 'https://luma.com/tsgcml9c'),
  roundup('2026-10-19', 'Bring the Chapters Together', 'Integrate reviewed changes into coherent chapter drafts.', 'https://luma.com/8aiegsj7'),
  roundup('2026-10-26', 'Review Across Workgroups', 'Check terminology, overlaps, conflicts, and omissions across chapters.', 'https://luma.com/rxqag23s'),
  roundup('2026-11-02', 'V1 Readiness Review', 'Review chapters against the adopted checklist and identify release blockers.', 'https://luma.com/377f2m3g'),
  roundup('2026-11-09', 'Final Review Before Launch', 'Verify final corrections and acknowledgments before the 1 p.m. editorial freeze.', 'https://luma.com/ztjmzdiq'),
  {
    kind: 'launch', date: '2026-11-13', focus: 'Desirable Properties V1 Launch',
    objective: 'Present Version 1.0, recognize contributions, and discuss the next phase.',
    lumaUrl: 'https://luma.com/uhb8828e',
    startsAt: DP_V1_LAUNCH_START, endsAt: DP_V1_LAUNCH_END,
    timeLabel: V1_LAUNCH_TIME_LABEL, clockShort: V1_LAUNCH_CLOCK_SHORT,
    recordingHref: '/events/v1-launch',
  },
  {
    kind: 'gathering', date: '2026-11-16', focus: 'DP Meta-Governance: Creating a Living Book Together',
    // Same as SESSION_2026_11_16.meetingTitle (src/data/sessions/2026-11-16.ts); the test checks they match.
    meetingTitle: 'Meeting agreements: how we decide',
    objective: 'Look back on how V1 was made and shape a shared, ongoing process for the living book.',
    lumaUrl: 'https://luma.com/6bqcfew2',
    startsAt: '2026-11-16T10:00:00-08:00', endsAt: '2026-11-16T11:30:00-08:00',
    timeLabel: META_GOVERNANCE_TIME_LABEL, clockShort: META_GOVERNANCE_CLOCK_SHORT,
    pageHref: '/events/meta-governance-2026-11-16', chatAnchor: 'session-chat',
    pageContents: 'Notes, the draft for review and the session chat.',
    details: 'With Version 1.0 launched, this Meta-Layer Monday turns to the governance of the Desirable Properties process itself. We will review what we learned from contributing, filling co-editor seats, reviewing proposals, and preparing revisions, and work toward a shared process for keeping the book alive. Contributors, co-editors, coordinators, steering committee members, and anyone interested are welcome.',
  },
  {
    ...listeningExperiment(1, '2026-11-23', 'https://luma.com/nqyu7j5r',
      'Ballot results and the first weekly cycle',
      'Results of the 16 November ballot and the first weekly cycle.',
      'This week: results and the first cycle. Voting on the ballot from our 16 November session is open until Sunday 22 November, 8:00 PM PT, and anyone with an account can vote on the 16 November session page. We open with the results. Then we settle any ties, talk about one person, one vote (linking accounts so nobody can vote twice) and hear a new idea for a daily review sprint. If the pilot passes, this session also starts the first full weekly cycle.'),
    // Markabadi's process suggestions from his 20 Nov walk-through of the 16 Nov session page.
    raisedBetweenSessions: ['2026-11-20-session-page-review'],
  },
  listeningExperiment(2, '2026-11-30', 'https://luma.com/gra1xda9',
    'Co-editors and the council',
    'Co-editors and the council: the co-editor agreement, vetting, and how council elections run.',
    'This week: co-editors and the council. What should a co-editor agreement say, and what should a vetting questionnaire ask? If the community voted for a council, we also work out how its elections will run. We open with the record and outcomes from 23 November.'),
  listeningExperiment(3, '2026-12-07', 'https://luma.com/ihn1dfw9',
    'Growing the book',
    'Growing the book: chapter titles, a case studies appendix, a book club and bookathons.',
    'This week: growing the book. How a chapter can change its title, and how the book grows. We\'ll cover a case studies appendix, a book club, and university "bookathons". We open with the record and outcomes from 30 November.'),
  listeningExperiment(4, '2026-12-14', 'https://luma.com/pt5uhcqz',
    'Did the experiment work?',
    'Did the experiment work? Keep, change or stop the weekly cycle.',
    'This week: did the experiment work? We look back at the four-session pilot: what worked, what didn\'t, and whether to keep the weekly cycle, change it or stop. We open with the record and outcomes from 7 December.'),
];

function pacificOffset(date: string) {
  return date < '2026-11-01' ? '-07:00' : '-08:00';
}

export const DP_ROUNDUP_EVENTS = sessions.map((s) => {
  const isRoundup = s.kind === 'roundup';
  if (!isRoundup && (!s.startsAt || !s.endsAt || !s.timeLabel)) {
    throw new Error(`dp-roundups: ${s.date} (${s.kind}) needs explicit startsAt, endsAt and timeLabel`);
  }
  return {
    kind: s.kind,
    date: s.date,
    focus: s.focus,
    objective: s.objective,
    lumaUrl: s.lumaUrl,
    details: s.details ?? null,
    recordingHref: s.recordingHref ?? null,
    pageHref: s.pageHref ?? null,
    chatAnchor: s.chatAnchor ?? null,
    pageContents: s.pageContents ?? null,
    /** Specific meeting title for community sessions; null for roundups and the launch. */
    meetingTitle: s.meetingTitle ?? null,
    thisWeek: s.thisWeek ?? null,
    seriesAbout: s.seriesAbout ?? null,
    raisedBetweenSessions: s.raisedBetweenSessions ?? [],
    /** Series name (the focus line). */
    seriesTitle: s.focus,
    title: isRoundup ? `DP Roundup: ${s.focus}` : s.focus,
    startsAt: s.startsAt ?? `${s.date}T11:30:00${pacificOffset(s.date)}`,
    endsAt: s.endsAt ?? `${s.date}T13:00:00${pacificOffset(s.date)}`,
    timeLabel: s.timeLabel ?? ROUNDUP_TIME_LABEL,
    clockShort: s.clockShort ?? s.timeLabel ?? ROUNDUP_TIME_LABEL,
    href: `/roundups/${s.date}`,
    launch: s.kind === 'launch',
  };
});

export type RoundupEvent = (typeof DP_ROUNDUP_EVENTS)[number];

/** Time-of-day label for a gathering. `short` is the event-card form. */
export function gatheringTimeLabel(event: Pick<RoundupEvent, 'timeLabel' | 'clockShort'>, style: 'long' | 'short' = 'long'): string {
  return style === 'short' ? event.clockShort : event.timeLabel;
}

/** Eyebrow label for an event page or card. */
export function gatheringKindLabel(event: Pick<RoundupEvent, 'kind'>): string {
  return event.kind === 'launch' ? 'Version 1.0 launch' : 'Meta-Layer Monday';
}

export function roundupDateLabel(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles',
  });
}

export const ROUNDUP_AGENDA = [
  ['11:30–11:35', 'Meta-Layer Initiative updates'],
  ['11:35–11:40', 'Agenda and burning questions'],
  ['11:40–11:50', 'Progress, open co-editor seats, and the co-editor process'],
  ['11:50–11:55', 'DP focus'],
  ['11:55–12:05', 'Workgroup updates and room selection'],
  ['12:05–12:45', 'Workgroup breakouts'],
  ['12:45–12:55', 'Reportback'],
  ['12:55–1:00', 'Open mic and close'],
] as const;

export function nextRoundup(now = new Date()) {
  return DP_ROUNDUP_EVENTS.find(event => new Date(event.endsAt) > now);
}
