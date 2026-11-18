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
};

const roundup = (date: string, focus: string, objective: string, lumaUrl: string): SessionInput =>
  ({ kind: 'roundup', date, focus, objective, lumaUrl });

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
    objective: 'Look back on how V1 was made and shape a shared, ongoing process for the living book.',
    lumaUrl: 'https://luma.com/6bqcfew2',
    startsAt: '2026-11-16T10:00:00-08:00', endsAt: '2026-11-16T11:30:00-08:00',
    timeLabel: META_GOVERNANCE_TIME_LABEL, clockShort: META_GOVERNANCE_CLOCK_SHORT,
    pageHref: '/events/meta-governance-2026-11-16', chatAnchor: 'session-chat',
    pageContents: 'Notes, the draft for review and the session chat.',
    details: 'With Version 1.0 launched, this Meta-Layer Monday turns to the governance of the Desirable Properties process itself. We will review what we learned from contributing, filling co-editor seats, reviewing proposals, and preparing revisions, and work toward a shared process for keeping the book alive. Contributors, co-editors, coordinators, steering committee members, and anyone interested are welcome.',
  },
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
