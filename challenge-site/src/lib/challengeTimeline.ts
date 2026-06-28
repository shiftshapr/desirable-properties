import timelineData from '@/data/challenge-timeline.json';

export type MilestoneStatus = 'past' | 'current' | 'upcoming';

export type ChallengeMilestone = {
  id: string;
  dateLabel: string;
  startDate: string;
  endDate?: string;
  title: string;
  description: string;
  href?: string;
  linkLabel?: string;
};

export type EnrichedMilestone = ChallengeMilestone & {
  status: MilestoneStatus;
};

export type ChallengeTimelineMeta = {
  current_draft_version: string;
  target_version: string;
  book_launch_date: string;
  book_launch_title: string;
};

const milestones = timelineData.milestones as ChallengeMilestone[];
export const challengeMeta = timelineData.meta as ChallengeTimelineMeta;

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

export function enrichMilestones(now: Date = new Date()): EnrichedMilestone[] {
  return milestones.map((m) => ({
    ...m,
    status: getMilestoneStatus(m, now),
  }));
}

export function getCurrentMilestone(now: Date = new Date()): EnrichedMilestone | null {
  const enriched = enrichMilestones(now);
  return enriched.find((m) => m.status === 'current') ?? null;
}

export function getUpcomingMilestones(now: Date = new Date()): EnrichedMilestone[] {
  return enrichMilestones(now).filter((m) => m.status === 'upcoming');
}

export function getPastMilestones(now: Date = new Date()): EnrichedMilestone[] {
  return enrichMilestones(now).filter((m) => m.status === 'past');
}

export function getActiveAndUpcoming(now: Date = new Date()): EnrichedMilestone[] {
  return enrichMilestones(now).filter((m) => m.status !== 'past');
}

export function getBookLaunchDate(): Date {
  return new Date(challengeMeta.book_launch_date);
}

export function getCountdownTarget(now: Date = new Date()): Date | null {
  const launch = getBookLaunchDate();
  if (now >= launch) return null;
  return launch;
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
