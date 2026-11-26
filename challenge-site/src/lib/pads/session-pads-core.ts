/**
 * Session pads on /pads: every session page (listening sessions, the V1 launch, the community review, the DP
 * Roundups), newest first, with a one-line status. Derived from the session schedule (DP_ROUNDUP_EVENTS), the
 * occurrence phase histories (SESSION_OCCURRENCES) and the session ballots, so a new session appears on its own.
 * Of the sessions still to come, only the next one is listed.
 */
import { SESSION_BALLOTS } from '@/data/sessions/ballots';
import { SESSION_OCCURRENCES } from '@/data/sessions/occurrences';
import { effectiveStatus, type BallotOverride } from '@/lib/ballots/ballot-core';
import { COMMUNITY_REVIEW_EVENT } from '@/lib/community-review-event';
import { DP_ROUNDUP_EVENTS, roundupDateLabel } from '@/lib/dp-roundups';
import { pacificAndUtc, phaseRows, phaseTone, type PhaseTone } from '@/lib/sessions/session-phases';

export type SessionPad = {
  href: string;
  /** yyyy-mm-dd (Pacific). */
  date: string;
  startsAt: string;
  /** "Monday, November 16, 2026" */
  dateLabel: string;
  /** Series or kind: "DP Roundup", "Version 1.0 launch", the listening series name. */
  kind: string;
  title: string;
  /** One line on where it stands ("Voting open until …", "Recording and transcript", "Upcoming, 10–11:30 AM PT"). */
  status: string;
  tone: PhaseTone | 'upcoming' | 'held';
};

/** Ballot overrides (early close, published results) by ballot slug; missing means none. */
export type BallotOverrides = Readonly<Record<string, BallotOverride>>;

function occurrenceStatus(href: string, overrides: BallotOverrides, now: Date): { status: string; tone: SessionPad['tone'] } | null {
  const occurrence = SESSION_OCCURRENCES.find((o) => `/events/${o.slug}` === href);
  if (!occurrence) return null;
  const { current } = phaseRows(occurrence, now);
  const ballot = Object.values(SESSION_BALLOTS).find((b) => b.pagePath === href);
  if (ballot) {
    const status = effectiveStatus(ballot, overrides[ballot.slug] ?? null, now);
    if (status === 'open') return { status: `Voting open until ${pacificAndUtc(ballot.closesAt)}`, tone: 'vote' };
    if (status === 'closed') return { status: 'Voting closed; results to follow', tone: 'decided' };
    if (status === 'published') return { status: 'Voting closed; results published', tone: 'decided' };
  }
  return current ? { status: current, tone: phaseTone(current) } : null;
}

export function sessionPads(now: Date, overrides: BallotOverrides = {}): SessionPad[] {
  const t = now.getTime();
  const fromSchedule = DP_ROUNDUP_EVENTS.map<SessionPad>((e) => {
    const href = e.pageHref ?? e.recordingHref ?? e.href;
    const kind = e.kind === 'roundup' ? 'DP Roundup' : e.kind === 'launch' ? 'Version 1.0 launch' : e.seriesTitle;
    const title = e.kind === 'roundup' ? e.focus : e.kind === 'launch' ? 'Version 1.0 launch' : e.meetingTitle ?? e.title;
    const base = { href, date: e.date, startsAt: e.startsAt, dateLabel: roundupDateLabel(e.startsAt), kind, title };
    if (t < Date.parse(e.startsAt)) return { ...base, status: `Upcoming, ${e.clockShort}`, tone: 'upcoming' };
    if (t < Date.parse(e.endsAt)) return { ...base, status: 'Happening now', tone: 'upcoming' };
    const phase = occurrenceStatus(href, overrides, now);
    if (phase) return { ...base, ...phase };
    if (e.launch) return { ...base, status: e.recordingHref ? 'Recording, summary and transcript' : 'Held', tone: 'held' };
    return { ...base, status: e.kind === 'roundup' ? 'Held: agenda and the week’s tasks' : 'Held', tone: 'held' };
  });
  const review: SessionPad = {
    href: COMMUNITY_REVIEW_EVENT.dpLandingPath,
    date: COMMUNITY_REVIEW_EVENT.startsAt.slice(0, 10),
    startsAt: COMMUNITY_REVIEW_EVENT.startsAt,
    dateLabel: roundupDateLabel(COMMUNITY_REVIEW_EVENT.startsAt),
    kind: 'Community review',
    title: 'Community Review Draft event',
    ...(t < Date.parse(COMMUNITY_REVIEW_EVENT.startsAt)
      ? { status: 'Upcoming', tone: 'upcoming' as const }
      : { status: 'Held: how to patch and review the draft', tone: 'held' as const }),
  };
  const all = [...fromSchedule, review].sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
  const upcoming = all.filter((p) => Date.parse(p.startsAt) > t);
  const next = upcoming[upcoming.length - 1];
  return all.filter((p) => Date.parse(p.startsAt) <= t || p === next);
}
