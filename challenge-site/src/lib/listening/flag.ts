/**
 * Listening workspace feature flag (server side).
 * On only when DP_LISTENING_WORKSPACE=on AND DP_ENV is not "prod". Staging's pm2 config sets it on;
 * production's sets it off, and production's DP_ENV=prod keeps it off even if someone sets it on.
 * When off: no UI, every /api/listening route is a 404, and no listening-workspace SQL ever runs.
 */
export function listeningWorkspaceEnabled(): boolean {
  if ((process.env.DP_LISTENING_WORKSPACE || '').trim().toLowerCase() !== 'on') return false;
  if ((process.env.DP_ENV || '').trim().toLowerCase() === 'prod') return false;
  return true;
}
