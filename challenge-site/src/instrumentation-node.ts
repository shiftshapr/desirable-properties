/** Run the Review tab's automatic checks on a timer (see review-checks-sweep.server). Node runtime only. */
import { sweepAllReviewChecks, SWEEP_INTERVAL_MS } from '@/lib/review-checks-sweep.server';

if (process.env.NODE_ENV === 'production' && process.env.REVIEW_CHECKS_SWEEP !== 'off') {
  const tick = () =>
    sweepAllReviewChecks().catch((err) =>
      console.warn('[review-checks] sweep failed', err instanceof Error ? err.message : err),
    );
  setTimeout(tick, 60_000);
  setInterval(tick, SWEEP_INTERVAL_MS);
}
