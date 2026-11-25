/**
 * Voter participation across the weekly session ballots: which ballots each account voted on and its weekly streak.
 * Pure functions. The rows say only that an account voted on a ballot (any answer, Abstain included), never how:
 * owner ruling 25 Nov 2026 (pad votes D5) dropped the non-abstain counts, which showed part of how someone voted.
 * With PAD_VOTES_BACKEND=govhub, Gov Hub computes the same list (services/pad_votes.public_participation).
 */

/** One row per (ballot, account) that answered at least one question. */
export type ParticipationRow = { ballot_slug: string; user_id: string };

export type ParticipationBallot = { slug: string; closesAt: string };

export type VoterParticipation = {
  /** The account counted (after merging a person's second account into the first). */
  userId: string;
  /** Ballots with at least one answer of any kind, oldest first. */
  ballots: { slug: string }[];
  currentStreak: number;
  longestStreak: number;
};

/**
 * Streaks over the closed ballots in order. A ballot counts toward a streak when the voter answered it at all.
 * Weeks with no ballot are not in the list, so they never break a streak. The current streak ends with the most
 * recent closed ballot (0 if they did not vote on it).
 */
export function streaks(closedInOrder: readonly string[], counted: ReadonlySet<string>): { current: number; longest: number } {
  let run = 0;
  let longest = 0;
  for (const slug of closedInOrder) {
    run = counted.has(slug) ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  return { current: run, longest };
}

/** Per-voter participation. `merge` maps a second account to the account it belongs with (one person, one voter). */
export function participation(
  ballots: readonly ParticipationBallot[],
  rows: readonly ParticipationRow[],
  now: Date,
  merge: Readonly<Record<string, string>> = {},
): VoterParticipation[] {
  const order = [...ballots].sort((a, b) => a.closesAt.localeCompare(b.closesAt));
  const known = new Set(order.map((b) => b.slug));
  const closed = order.filter((b) => new Date(b.closesAt) <= now).map((b) => b.slug);
  const byVoter = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!known.has(r.ballot_slug)) continue;
    const id = merge[r.user_id] ?? r.user_id;
    const set = byVoter.get(id) ?? new Set<string>();
    set.add(r.ballot_slug);
    byVoter.set(id, set);
  }
  return [...byVoter.entries()].map(([userId, voted]) => {
    const s = streaks(closed, voted);
    return {
      userId,
      ballots: order.filter((b) => voted.has(b.slug)).map((b) => ({ slug: b.slug })),
      currentStreak: s.current,
      longestStreak: s.longest,
    };
  });
}

export type PublicVoter = {
  name: string;
  ballots: number;
  currentStreak: number;
  longestStreak: number;
};

export type PublicParticipation = {
  voters: number;
  listed: PublicVoter[];
  /** Voters not listed: they turned the setting off, or no real name is on record for the account yet. */
  others: number;
  /** Gov Hub did not answer and this is the last good copy (or empty). */
  stale?: boolean;
};

/**
 * The public list: participation only, never a choice. A voter is listed only with a real name on record and the
 * "show my name" setting on (default on). Sorted by current streak, then ballots voted, then name.
 */
export function publicParticipation(
  voters: readonly VoterParticipation[],
  nameFor: (userId: string) => string | null,
  hidden: ReadonlySet<string>,
): PublicParticipation {
  const listed: PublicVoter[] = [];
  for (const v of voters) {
    const name = hidden.has(v.userId) ? null : nameFor(v.userId);
    if (!name) continue;
    listed.push({ name, ballots: v.ballots.length, currentStreak: v.currentStreak, longestStreak: v.longestStreak });
  }
  listed.sort((a, b) => b.currentStreak - a.currentStreak || b.ballots - a.ballots || a.name.localeCompare(b.name));
  return { voters: voters.length, listed, others: voters.length - listed.length };
}

/** "Voted on 2 ballots · weekly streak 1 (longest 2)". */
export function participationLine(v: Pick<PublicVoter, 'ballots' | 'currentStreak' | 'longestStreak'>): string {
  return `Voted on ${v.ballots} ${v.ballots === 1 ? 'ballot' : 'ballots'} · weekly streak ${v.currentStreak} (longest ${v.longestStreak})`;
}
