/**
 * Public feed of what is coming up, read by Gov Hub's session_reminders and vote_reminders text jobs
 * (~/handoff/specs/sms-sending-and-go-live.md). GET /api/sessions/upcoming.
 *
 * Sessions: every listening-session occurrence (SESSION_OCCURRENCES) and every scheduled session on the site
 * (DP_ROUNDUP_EVENTS: listening sessions, roundups, the launch) starting within the next 14 days. One entry per page:
 * a scheduled session whose page is an occurrence page is listed once. Ballots: every session ballot open now.
 * Public data only; no account data.
 */
import { SESSION_BALLOTS } from '@/data/sessions/ballots';
import { SESSION_OCCURRENCES } from '@/data/sessions/occurrences';
import { effectiveStatus, type BallotDefinition, type BallotOverride } from '@/lib/ballots/ballot-core';
import { DP_ROUNDUP_EVENTS } from '@/lib/dp-roundups';
import type { SessionOccurrence } from '@/lib/sessions/session-phases';

export const UPCOMING_WINDOW_DAYS = 14;

export type UpcomingSession = {
  slug: string;
  title: string;
  /** ISO 8601, UTC. */
  starts_at: string;
  ends_at: string | null;
  /** Absolute URL of the session's page on this site. */
  url: string;
  /** listening | roundup | launch */
  kind: 'listening' | 'roundup' | 'launch';
  /** Series name for listening sessions ("DP Listening Experiment 1/4: …"); null otherwise. */
  series: string | null;
  /** Luma registration link, when the session has one. */
  register_url: string | null;
};

export type OpenBallot = {
  slug: string;
  title: string;
  opens_at: string;
  closes_at: string;
  /** Absolute URL of the ballot on its session page. */
  url: string;
};

export type UpcomingFeed = {
  generated_at: string;
  window_days: number;
  sessions: UpcomingSession[];
  open_ballots: OpenBallot[];
};

type FeedSources = {
  occurrences?: readonly SessionOccurrence[];
  schedule?: typeof DP_ROUNDUP_EVENTS;
  ballots?: Readonly<Record<string, BallotDefinition>>;
  overrides?: Readonly<Record<string, BallotOverride>>;
};

const toIso = (s: string) => new Date(s).toISOString();

export function siteOrigin(raw: string | undefined): string {
  return (raw?.trim() || 'https://desirableproperties.org').replace(/\/$/, '');
}

export function upcomingFeed(now: Date, origin: string, sources: FeedSources = {}): UpcomingFeed {
  const occurrences = sources.occurrences ?? SESSION_OCCURRENCES;
  const schedule = sources.schedule ?? DP_ROUNDUP_EVENTS;
  const ballots = sources.ballots ?? SESSION_BALLOTS;
  const overrides = sources.overrides ?? {};
  const t = now.getTime();
  const until = t + UPCOMING_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const inWindow = (iso: string) => {
    const s = Date.parse(iso);
    return Number.isFinite(s) && s >= t && s <= until;
  };
  const abs = (path: string) => (path.startsWith('http') ? path : `${origin}${path.startsWith('/') ? '' : '/'}${path}`);

  const byPath = new Map<string, UpcomingSession>();
  for (const e of schedule) {
    if (!inWindow(e.startsAt)) continue;
    const path = e.pageHref ?? e.href;
    const kind = e.kind === 'roundup' ? 'roundup' : e.kind === 'launch' ? 'launch' : 'listening';
    const eventSlug = path.startsWith('/events/') ? path.slice('/events/'.length) : `${kind}-${e.date}`;
    byPath.set(path, {
      slug: eventSlug,
      title: kind === 'listening' ? (e.meetingTitle ?? e.title) : e.title,
      starts_at: toIso(e.startsAt),
      ends_at: toIso(e.endsAt),
      url: abs(path),
      kind,
      series: kind === 'listening' ? e.seriesTitle : null,
      register_url: e.lumaUrl || null,
    });
  }
  for (const o of occurrences) {
    if (!inWindow(o.heldFrom)) continue;
    const path = `/events/${o.slug}`;
    const existing = byPath.get(path);
    byPath.set(path, {
      slug: o.slug,
      title: o.meetingTitle || o.title,
      starts_at: toIso(o.heldFrom),
      ends_at: o.heldTo ? toIso(o.heldTo) : (existing?.ends_at ?? null),
      url: abs(path),
      kind: 'listening',
      series: o.title,
      register_url: existing?.register_url ?? null,
    });
  }
  const sessions = [...byPath.values()].sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));

  const open_ballots = Object.values(ballots)
    .filter((b) => effectiveStatus(b, overrides[b.slug] ?? null, now) === 'open')
    .map<OpenBallot>((b) => ({
      slug: b.slug,
      title: b.title,
      opens_at: toIso(b.opensAt),
      closes_at: toIso(b.closesAt),
      url: abs(`${b.pagePath}#vote`),
    }))
    .sort((a, b) => Date.parse(a.closes_at) - Date.parse(b.closes_at));

  return { generated_at: now.toISOString(), window_days: UPCOMING_WINDOW_DAYS, sessions, open_ballots };
}
