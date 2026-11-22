import 'server-only';
import { SESSION_BALLOTS } from '@/data/sessions/2026-11-16-ballot';
import { getBallotOverride } from '@/lib/ballots/ballot-store.server';
import { sessionPads, type BallotOverrides, type SessionPad } from '@/lib/pads/session-pads-core';

/** Session pads with each ballot's recorded early close or published results (none when the database is unavailable). */
export async function loadSessionPads(now = new Date()): Promise<SessionPad[]> {
  const entries = await Promise.all(
    Object.keys(SESSION_BALLOTS).map(async (slug) => [slug, await getBallotOverride(slug).catch(() => null)] as const),
  );
  const overrides: BallotOverrides = Object.fromEntries(entries);
  return sessionPads(now, overrides);
}
