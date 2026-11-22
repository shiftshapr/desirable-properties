/**
 * Meeting pads (/pads/meetings/[slug]) preview flag. Server side only.
 *
 * On only when MEETING_PADS_PREVIEW=on AND DP_ENV is not "prod"/"production" (same shape as
 * src/lib/listening/flag.ts; landing pads use src/lib/landing-pads/flag.ts). Staging's pm2 config sets it on;
 * production's sets it off, and production's DP_ENV keeps it off even if someone sets it on.
 *
 * When off: every meeting pad is a 404 (noindex), the invite panel cannot send for a meeting pad, and nothing
 * links to one. While on, pads are still noindex and are not listed on /pads, in the menu or anywhere public:
 * the first pad is a private call whose participant has not consented to being named.
 */
export function meetingPadsPreviewEnabled(): boolean {
  if ((process.env.MEETING_PADS_PREVIEW || '').trim().toLowerCase() !== 'on') return false;
  const dpEnv = (process.env.DP_ENV || '').trim().toLowerCase();
  if (dpEnv === 'prod' || dpEnv === 'production') return false;
  return true;
}
