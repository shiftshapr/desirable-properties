/** Run the Review tab's automatic checks on a timer (see review-checks-sweep.server). Node runtime only. */
import { sweepAllReviewChecks, SWEEP_INTERVAL_MS } from '@/lib/review-checks-sweep.server';
import { PAD_FOLLOW_SWEEP_INTERVAL_MS, sweepPadFollows } from '@/lib/pads/pad-follow-sweep.server';
import { padFollowEmailsOn } from '@/lib/pads/pad-settings';

if (process.env.NODE_ENV === 'production' && process.env.REVIEW_CHECKS_SWEEP !== 'off') {
  const tick = () =>
    sweepAllReviewChecks().catch((err) =>
      console.warn('[review-checks] sweep failed', err instanceof Error ? err.message : err),
    );
  setTimeout(tick, 60_000);
  setInterval(tick, SWEEP_INTERVAL_MS);
}

/** Email followers of proposal pads when a status changes (pad-follow-sweep.server). Off unless PAD_FOLLOW_EMAILS=on. */
if (process.env.NODE_ENV === 'production' && padFollowEmailsOn(process.env.PAD_FOLLOW_EMAILS)) {
  const padTick = () =>
    sweepPadFollows().catch((err) =>
      console.warn('[pad-follow] sweep failed', err instanceof Error ? err.message : err),
    );
  setTimeout(padTick, 90_000);
  setInterval(padTick, PAD_FOLLOW_SWEEP_INTERVAL_MS);
}
