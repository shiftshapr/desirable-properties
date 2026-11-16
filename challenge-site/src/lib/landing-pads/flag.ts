/**
 * Landing pads (DP Studio /pad, /pad/{slug}, /pad/person/{slug}, /api/pad/*) feature flag.
 *
 * Server side only (also safe in middleware and next.config, which read env at build time).
 * On unless DP_ENV is "prod"/"production": production hides landing pads (owner, 16 Nov 2026).
 * Non-production can also turn them off with DP_LANDING_PADS=off. DP_LANDING_PADS cannot turn
 * them on in production.
 *
 * When off: every pad page is a 404 (noindex), every /api/pad route and /api/admin/pad-settings
 * returns 404 with no data and no writes, and no nav, sidebar or admin entry links to a pad.
 * Pad code and stored pad data are kept as they are.
 */
export function landingPadsEnabled(): boolean {
  const dpEnv = (process.env.DP_ENV || '').trim().toLowerCase();
  if (dpEnv === 'prod' || dpEnv === 'production') return false;
  const flag = (process.env.DP_LANDING_PADS || '').trim().toLowerCase();
  if (flag === 'off' || flag === '0' || flag === 'false') return false;
  return true;
}
