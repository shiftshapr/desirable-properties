/**
 * Voter participation across the weekly session ballots: which ballots each account voted on, how many non-abstain
 * answers it cast, and its weekly streak. Pure functions; the counts come from dp_ballot_vote at request time
 * (participation.server.ts), already aggregated in SQL, so no vote choice ever reaches this code.
 */

/** One row per (ballot, account): the number of answers that were not Abstain. Skipped questions have no row. */
export type ParticipationRow = { ballot_slug: string; user_id: string; non_abstain: number };

export type ParticipationBallot = { slug: string; closesAt: string };

export type VoterParticipation = {
  /** The account counted (after merging a person's second account into the first). */
  userId: string;
  /** Ballots with at least one answer of any kind, oldest first. */
  ballots: { slug: string; nonAbstain: number }[];
  nonAbstain: number;
  currentStreak: number;
  longestStreak: number;
};

/**
 * Streaks over the closed ballots in order. A ballot counts toward a streak when the voter cast at least one
 * non-abstain vote on it. Weeks with no ballot are not in the list, so they never break a streak. The current
 * streak ends with the most recent closed ballot (0 if they did not vote on it).
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

/**
 * Per-voter participation. `merge` maps a second account to the account it belongs with (one person, one voter);
 * their non-abstain counts on the same ballot are not added twice: the larger one is kept.
 */
export function participation(
  ballots: readonly ParticipationBallot[],
  rows: readonly ParticipationRow[],
  now: Date,
  merge: Readonly<Record<string, string>> = {},
): VoterParticipation[] {
  const order = [...ballots].sort((a, b) => a.closesAt.localeCompare(b.closesAt));
  const known = new Set(order.map((b) => b.slug));
  const closed = order.filter((b) => new Date(b.closesAt) <= now).map((b) => b.slug);
  const byVoter = new Map<string, Map<string, number>>();
  for (const r of rows) {
    if (!known.has(r.ballot_slug)) continue;
    const id = merge[r.user_id] ?? r.user_id;
    const m = byVoter.get(id) ?? new Map<string, number>();
    m.set(r.ballot_slug, Math.max(m.get(r.ballot_slug) ?? 0, Math.max(0, Number(r.non_abstain) || 0)));
    byVoter.set(id, m);
  }
  return [...byVoter.entries()].map(([userId, m]) => {
    const list = order.filter((b) => m.has(b.slug)).map((b) => ({ slug: b.slug, nonAbstain: m.get(b.slug) ?? 0 }));
    const counted = new Set(list.filter((b) => b.nonAbstain > 0).map((b) => b.slug));
    const s = streaks(closed, counted);
    return {
      userId,
      ballots: list,
      nonAbstain: list.reduce((n, b) => n + b.nonAbstain, 0),
      currentStreak: s.current,
      longestStreak: s.longest,
    };
  });
}

export type PublicVoter = {
  name: string;
  ballots: number;
  nonAbstain: number;
  currentStreak: number;
  longestStreak: number;
};

export type PublicParticipation = {
  voters: number;
  listed: PublicVoter[];
  /** Voters not listed: they turned the setting off, or no real name is on record for the account yet. */
  others: number;
};

/**
 * The public list: participation only, never a choice. A voter is listed only with a real name on record and the
 * "show my name" setting on (default on). Sorted by current streak, then non-abstain votes, then name.
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
    listed.push({
      name,
      ballots: v.ballots.length,
      nonAbstain: v.nonAbstain,
      currentStreak: v.currentStreak,
      longestStreak: v.longestStreak,
    });
  }
  listed.sort((a, b) => b.currentStreak - a.currentStreak || b.nonAbstain - a.nonAbstain || a.name.localeCompare(b.name));
  return { voters: voters.length, listed, others: voters.length - listed.length };
}

/** "Voted on 1 ballot · 15 non-abstain votes · streak 1 (longest 1)". */
export function participationLine(v: Pick<PublicVoter, 'ballots' | 'nonAbstain' | 'currentStreak' | 'longestStreak'>): string {
  return `Voted on ${v.ballots} ${v.ballots === 1 ? 'ballot' : 'ballots'} · ${v.nonAbstain} non-abstain ${v.nonAbstain === 1 ? 'vote' : 'votes'} · weekly streak ${v.currentStreak} (longest ${v.longestStreak})`;
}
