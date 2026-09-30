/** Confirmed 2026 series schedule. November dates use PST after the DST change. */
export const DP_V1_LAUNCH_START = '2026-11-13T11:30:00-08:00';
export const DP_V1_FREEZE = '2026-11-09T13:00:00-08:00';
export const ROUNDUP_TIME_LABEL = '11:30 a.m.–1:00 p.m. Pacific Time';

const sessions = [
  ['2026-09-28', 'Find Your Workgroup', 'Get direction, meet collaborators, and choose a first contribution.', 'https://luma.com/5fjbcp9l'],
  ['2026-10-05', 'Turn Feedback into Proposals', 'Turn chapter comments into specific proposals with owners and reviewers.', 'https://luma.com/9zl8o8n8'],
  ['2026-10-12', 'Resolve the Hard Questions', 'Address competing wording, missing evidence, and substantive objections.', 'https://luma.com/tsgcml9c'],
  ['2026-10-19', 'Bring the Chapters Together', 'Integrate reviewed changes into coherent chapter drafts.', 'https://luma.com/8aiegsj7'],
  ['2026-10-26', 'Review Across Workgroups', 'Check terminology, overlaps, conflicts, and omissions across chapters.', 'https://luma.com/rxqag23s'],
  ['2026-11-02', 'V1 Readiness Review', 'Review chapters against the adopted checklist and identify release blockers.', 'https://luma.com/377f2m3g'],
  ['2026-11-09', 'Final Review Before Launch', 'Verify final corrections and acknowledgments before the 1 p.m. editorial freeze.', 'https://luma.com/ztjmzdiq'],
  ['2026-11-13', 'Desirable Properties V1 Launch', 'Present Version 1.0, recognize contributions, and discuss the next phase.', 'https://luma.com/uhb8828e'],
] as const;

export const DP_ROUNDUP_EVENTS = sessions.map(([date, focus, objective, lumaUrl], index) => {
  const offset = date < '2026-11-01' ? '-07:00' : '-08:00';
  return {
    date, focus, objective, lumaUrl,
    title: index === 7 ? focus : `DP Roundup: ${focus}`,
    startsAt: index === 7 ? DP_V1_LAUNCH_START : `${date}T11:30:00${offset}`,
    endsAt: `${date}T13:00:00${offset}`,
    href: `/roundups/${date}`,
    launch: index === 7,
  };
});

export function roundupDateLabel(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles',
  });
}

export const ROUNDUP_AGENDA = [
  ['11:30–11:35', 'Meta-Layer Initiative updates'],
  ['11:35–11:40', 'Agenda and burning questions'],
  ['11:40–11:50', 'DP progress and tooling overview'],
  ['11:50–11:55', 'DP focus'],
  ['11:55–12:05', 'Workgroup updates and room selection'],
  ['12:05–12:45', 'Workgroup breakouts'],
  ['12:45–12:55', 'Reportback'],
  ['12:55–1:00', 'Open mic and close'],
] as const;

export function nextRoundup(now = new Date()) {
  return DP_ROUNDUP_EVENTS.find(event => new Date(event.endsAt) > now);
}
