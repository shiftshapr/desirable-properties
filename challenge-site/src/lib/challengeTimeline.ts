import { DP_V1_LAUNCH_START } from '@/lib/dp-roundups';
import timelineData from '@/data/challenge-timeline.json';
import { CHALLENGE_KEY_DATES } from '@/lib/dp-welcome-content.generated';

/**
 * The timeline is managed in meta-console/estate-timeline.yaml (tag: desirable-properties).
 * Pages read it live with loadChallengeMilestones(); challenge-timeline.json is the saved
 * fallback copy (refresh it with python3 meta-console/scripts/export-estate-timeline.py).
 */

export type MilestoneStatus = 'past' | 'current' | 'upcoming';

export type ChallengeMilestoneLink = {
  href: string;
  label: string;
};

export type ChallengeMilestone = {
  id: string;
  dateLabel: string;
  startDate: string;
  endDate?: string;
  title: string;
  description: string;
  href?: string;
  linkLabel?: string;
  links?: ChallengeMilestoneLink[];
};

export type EnrichedMilestone = ChallengeMilestone & {
  status: MilestoneStatus;
};

export type ChallengeTimelineMeta = {
  current_draft_version: string;
  target_version: string;
  book_launch_date: string;
  book_launch_title: string;
  v1_release_date?: string;
  v1_release_title?: string;
  source?: string;
};

const milestones = timelineData.milestones as ChallengeMilestone[];
export const challengeMeta = timelineData.meta as ChallengeTimelineMeta;

/** The saved copy (fallback when meta-console can't be reached). */
export const SAVED_MILESTONES = milestones;

const LIVE_TIMELINE_URL = 'https://console.themetalayer.org/api/timeline/export/desirable-properties';

/** meta-console export URL; DP_TIMELINE_URL overrides (staging points it at the staging console). */
export function liveTimelineUrl(env: Record<string, string | undefined> = process.env): string {
  return env.DP_TIMELINE_URL?.trim() || LIVE_TIMELINE_URL;
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v : undefined;
}

/** Keep only well-formed milestones from the console payload; null if nothing usable. */
export function parseLiveMilestones(payload: unknown): ChallengeMilestone[] | null {
  const rows = (payload as { milestones?: unknown })?.milestones;
  if (!Array.isArray(rows)) return null;
  const out: ChallengeMilestone[] = [];
  for (const raw of rows as Record<string, unknown>[]) {
    if (!raw || typeof raw !== 'object') continue;
    const id = str(raw.id);
    const dateLabel = str(raw.dateLabel);
    const startDate = str(raw.startDate);
    const title = str(raw.title);
    if (!id || !dateLabel || !startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !title) continue;
    const m: ChallengeMilestone = { id, dateLabel, startDate, title, description: str(raw.description) ?? '' };
    const endDate = str(raw.endDate);
    if (endDate && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) m.endDate = endDate;
    const href = str(raw.href);
    if (href) m.href = href;
    const linkLabel = str(raw.linkLabel);
    if (linkLabel) m.linkLabel = linkLabel;
    if (Array.isArray(raw.links)) {
      const links = (raw.links as { href?: unknown; label?: unknown }[])
        .map((l) => ({ href: str(l?.href), label: str(l?.label) }))
        .filter((l): l is ChallengeMilestoneLink => Boolean(l.href && l.label));
      if (links.length) m.links = links;
    }
    out.push(m);
  }
  return out.length ? out : null;
}

/**
 * Milestones read live from meta-console (estate-timeline.yaml), refreshed every 5 minutes,
 * so a meta-console release alone updates the Challenge timeline (owner, 2026-11-26).
 * Falls back to the saved challenge-timeline.json. Server-only.
 */
export async function loadChallengeMilestones(fetchImpl: typeof fetch = fetch): Promise<ChallengeMilestone[]> {
  try {
    const res = await fetchImpl(liveTimelineUrl(), {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(5000),
    } as RequestInit);
    if (!res.ok) return SAVED_MILESTONES;
    return parseLiveMilestones(await res.json()) ?? SAVED_MILESTONES;
  } catch {
    return SAVED_MILESTONES;
  }
}

function parseEnd(dateStr: string): Date {
  const d = new Date(`${dateStr}T23:59:59`);
  return d;
}

function parseStart(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`);
}

export function getMilestoneStatus(
  milestone: ChallengeMilestone,
  now: Date = new Date(),
): MilestoneStatus {
  const start = parseStart(milestone.startDate);
  const end = parseEnd(milestone.endDate ?? milestone.startDate);
  if (now > end) return 'past';
  if (now < start) return 'upcoming';
  return 'current';
}

export function enrichMilestones(
  now: Date = new Date(),
  source: ChallengeMilestone[] = milestones,
): EnrichedMilestone[] {
  return source.map((m) => ({
    ...m,
    status: getMilestoneStatus(m, now),
  }));
}

export function getCurrentMilestones(
  now: Date = new Date(),
  source: ChallengeMilestone[] = milestones,
): EnrichedMilestone[] {
  return enrichMilestones(now, source).filter((m) => m.status === 'current');
}

export function getCurrentMilestone(now: Date = new Date()): EnrichedMilestone | null {
  return getCurrentMilestones(now)[0] ?? null;
}

export function getUpcomingMilestones(
  now: Date = new Date(),
  source: ChallengeMilestone[] = milestones,
): EnrichedMilestone[] {
  return enrichMilestones(now, source).filter((m) => m.status === 'upcoming');
}

export function getPastMilestones(
  now: Date = new Date(),
  source: ChallengeMilestone[] = milestones,
): EnrichedMilestone[] {
  return enrichMilestones(now, source).filter((m) => m.status === 'past');
}

export function getActiveAndUpcoming(
  now: Date = new Date(),
  source: ChallengeMilestone[] = milestones,
): EnrichedMilestone[] {
  return enrichMilestones(now, source).filter((m) => m.status !== 'past');
}

export function getBookLaunchDate(): Date {
  return new Date(`${CHALLENGE_KEY_DATES.bookLaunch.iso}T09:00:00-07:00`);
}

export function getV1ReleaseDate(): Date {
  // Keep the countdown and Roundup launch event on the same confirmed instant.
  return new Date(DP_V1_LAUNCH_START);
}

export type CountdownMilestone = {
  target: Date;
  title: string;
  dateLabel: string;
};

export function getCountdownMilestone(now: Date = new Date()): CountdownMilestone | null {
  const communityDraft = getBookLaunchDate();
  if (now < communityDraft) {
    return {
      target: communityDraft,
      title: challengeMeta.book_launch_title,
      dateLabel: CHALLENGE_KEY_DATES.bookLaunch.label,
    };
  }

  const v1Release = getV1ReleaseDate();
  if (now < v1Release) {
    return {
      target: v1Release,
      title: challengeMeta.v1_release_title ?? CHALLENGE_KEY_DATES.v1Release.title,
      dateLabel: CHALLENGE_KEY_DATES.v1Release.label,
    };
  }

  return null;
}

export function getCountdownTarget(now: Date = new Date()): Date | null {
  return getCountdownMilestone(now)?.target ?? null;
}

export function formatCountdownParts(target: Date, now: Date = new Date()) {
  const diff = Math.max(0, target.getTime() - now.getTime());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds, totalMs: diff };
}

export function isWorkgroupFormationPhase(now: Date = new Date()): boolean {
  const wg = milestones.find((m) => m.id === 'workgroup-formation');
  if (!wg) return false;
  return getMilestoneStatus(wg, now) === 'current';
}

export function isBeforeWorkgroupFormation(now: Date = new Date()): boolean {
  const wg = milestones.find((m) => m.id === 'workgroup-formation');
  if (!wg) return false;
  return now < parseStart(wg.startDate);
}

export { milestones as allMilestones };
