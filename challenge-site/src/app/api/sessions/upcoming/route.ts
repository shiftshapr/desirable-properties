import { NextResponse } from 'next/server';
import { SESSION_BALLOTS } from '@/data/sessions/ballots';
import { effectiveStatus, type BallotOverride } from '@/lib/ballots/ballot-core';
import { getBallotOverride } from '@/lib/ballots/ballot-store.server';
import { siteOrigin, upcomingFeed } from '@/lib/sessions/upcoming-feed';

/**
 * Public: sessions starting in the next 14 days and the session ballots open now (src/lib/sessions/upcoming-feed.ts).
 * Read by Gov Hub's text reminder jobs. Computed per request (it depends on the clock); only ballots open by their
 * dates are checked for an early close in the database.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const now = new Date();
  const overrides: Record<string, BallotOverride> = {};
  await Promise.all(
    Object.values(SESSION_BALLOTS)
      .filter((b) => effectiveStatus(b, null, now) === 'open')
      .map(async (b) => {
        overrides[b.slug] = await getBallotOverride(b.slug).catch(() => null);
      }),
  );
  const feed = upcomingFeed(now, siteOrigin(process.env.DP_PUBLIC_BASE), { overrides });
  return NextResponse.json(feed, {
    headers: { 'Cache-Control': 'public, max-age=300', 'Access-Control-Allow-Origin': '*' },
  });
}
