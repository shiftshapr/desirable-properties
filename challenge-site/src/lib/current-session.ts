import { DP_ROUNDUP_EVENTS, roundupDateLabel, type RoundupEvent } from '@/lib/dp-roundups';
import { REVIEW_WINDOW_HOURS } from '@/lib/sessions/session-rules';
import { SESSION_BALLOTS } from '@/data/sessions/2026-11-16-ballot';

/**
 * The current community session:
 * 1. a session that has started and whose ballot is still open (now before its closesAt) stays current, so the
 *    menu and front page keep sending people to vote; the latest such session wins;
 * 2. otherwise the earliest session that has not ended, or ended less than SESSION_GRACE_MS ago (48 hours: the
 *    correction window decided in the 16 Nov ballot), so on a session's own day the menu still points at that session's page;
 * 3. otherwise the most recent one.
 * Ballots come from SESSION_BALLOTS, matched to a session by pagePath === pageHref. An early stop recorded in the
 * dp_ballot table is not consulted here; the switch happens at the definition's closesAt.
 *
 * Source: the `gathering` entries in DP_ROUNDUP_EVENTS (src/lib/dp-roundups.ts). To announce the next
 * session, add one entry there (kind 'gathering', its startsAt/endsAt, and pageHref once it has a page);
 * the menu, the front page and /events follow. V1 DP Roundups and the launch are never "current".
 */
export type CurrentSession = {
  /** Series title (unchanged: menus and emails use it). */
  title: string;
  /** What this meeting is about, when set ("Meeting agreements: how we decide"). */
  meetingTitle: string | null;
  date: string;
  /** "Monday, November 16, 2026" */
  dateLabel: string;
  /** "10:00 a.m. Pacific" */
  startLabel: string;
  /** The session page, or its /roundups/<date> page until it has one. */
  href: string;
  /** Session chat on the session page, when the page has one. */
  chatHref: string | null;
  /** One line on what the session page holds. */
  pageContents: string | null;
  lumaUrl: string;
  /** True until the session ends; false once it has ended (still current while its ballot is open, or the most recent). */
  upcoming: boolean;
};

function communitySessions(): RoundupEvent[] {
  return DP_ROUNDUP_EVENTS.filter((event) => event.kind === 'gathering').sort(
    (a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt),
  );
}

/** "10:00 a.m. Pacific" from a session start. */
export function pacificStartLabel(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Los_Angeles',
  }).formatToParts(new Date(iso));
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
  const pm = (parts.find((p) => p.type === 'dayPeriod')?.value ?? '').toUpperCase().startsWith('P');
  return `${hour}:${minute} ${pm ? 'p.m.' : 'a.m.'} Pacific`;
}

type BallotWindow = { pagePath: string; closesAt: string };

/** The latest started session whose ballot has not closed yet, if any. */
export function sessionWithOpenBallot(
  sessions: readonly RoundupEvent[],
  now: Date,
  ballots: readonly BallotWindow[] = Object.values(SESSION_BALLOTS),
): RoundupEvent | undefined {
  const t = now.getTime();
  return [...sessions].reverse().find((event) =>
    event.pageHref
    && Date.parse(event.startsAt) <= t
    && ballots.some((b) => b.pagePath === event.pageHref && t < Date.parse(b.closesAt)));
}

/** How long a session stays current after it ends: the correction window (REVIEW_WINDOW_HOURS). */
export const SESSION_GRACE_MS = REVIEW_WINDOW_HOURS * 60 * 60 * 1000;

export function currentSession(
  now = new Date(),
  options: { sessions?: readonly RoundupEvent[]; ballots?: readonly BallotWindow[] } = {},
): CurrentSession {
  const sessions = options.sessions ?? communitySessions();
  if (!sessions.length) throw new Error('current-session: no community session in DP_ROUNDUP_EVENTS');
  const voting = sessionWithOpenBallot(sessions, now, options.ballots);
  const next = sessions.find((event) => Date.parse(event.endsAt) + SESSION_GRACE_MS > now.getTime());
  const event = voting ?? next ?? sessions[sessions.length - 1];
  const href = event.pageHref ?? event.href;
  return {
    title: event.title,
    meetingTitle: event.meetingTitle,
    date: event.date,
    dateLabel: roundupDateLabel(event.startsAt),
    startLabel: pacificStartLabel(event.startsAt),
    href,
    chatHref: event.pageHref && event.chatAnchor ? `${event.pageHref}#${event.chatAnchor}` : null,
    pageContents: event.pageContents,
    lumaUrl: event.lumaUrl,
    upcoming: Date.parse(event.endsAt) > now.getTime(),
  };
}
