/** Server start-up: run the Review tab's automatic checks on a timer (see review-checks-sweep.server). */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NODE_ENV !== 'production' || process.env.REVIEW_CHECKS_SWEEP === 'off') return;
  const { sweepAllReviewChecks, SWEEP_INTERVAL_MS } = await import('@/lib/review-checks-sweep.server');
  const tick = () =>
    sweepAllReviewChecks().catch((err) =>
      console.warn('[review-checks] sweep failed', err instanceof Error ? err.message : err),
    );
  setTimeout(tick, 60_000);
  setInterval(tick, SWEEP_INTERVAL_MS);
}
