import { DP_ROUNDUP_EVENTS, roundupDateLabel, type RoundupEvent } from '@/lib/dp-roundups';

/**
 * The current community session: the next one that has not ended yet, otherwise the most recent one.
 *
 * Source: the `gathering` entries in DP_ROUNDUP_EVENTS (src/lib/dp-roundups.ts). To announce the next
 * session, add one entry there (kind 'gathering', its startsAt/endsAt, and pageHref once it has a page);
 * the menu, the front page and /events follow. V1 DP Roundups and the launch are never "current".
 */
export type CurrentSession = {
  title: string;
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
  /** True until the session ends; false once it is the most recent past session. */
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

export function currentSession(now = new Date()): CurrentSession {
  const sessions = communitySessions();
  if (!sessions.length) throw new Error('current-session: no community session in DP_ROUNDUP_EVENTS');
  const next = sessions.find((event) => Date.parse(event.endsAt) > now.getTime());
  const event = next ?? sessions[sessions.length - 1];
  const href = event.pageHref ?? event.href;
  return {
    title: event.title,
    date: event.date,
    dateLabel: roundupDateLabel(event.startsAt),
    startLabel: pacificStartLabel(event.startsAt),
    href,
    chatHref: event.pageHref && event.chatAnchor ? `${event.pageHref}#${event.chatAnchor}` : null,
    pageContents: event.pageContents,
    lumaUrl: event.lumaUrl,
    upcoming: Boolean(next),
  };
}
