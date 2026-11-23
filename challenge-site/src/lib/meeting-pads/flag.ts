import { isMeetingPadPublic, type MeetingPad } from '@/lib/meeting-pads/types';

/**
 * Meeting pads (/pads/meetings/[slug]) preview flag. Server side only.
 *
 * On only when MEETING_PADS_PREVIEW=on AND DP_ENV is not "prod"/"production" (same shape as
 * src/lib/listening/flag.ts; landing pads use src/lib/landing-pads/flag.ts). Staging's pm2 config sets it on;
 * production's sets it off, and production's DP_ENV keeps it off even if someone sets it on.
 *
 * The flag only governs pads that are not public. A public pad (isMeetingPadPublic in ./types: visibility 'public'
 * and every non-host participant consented) is served everywhere, production included, whatever this flag says:
 * indexable, no "Staging preview" banner, listed on /pads, and its invite panel works.
 *
 * For every other pad, when off: a 404 (noindex), the invite panel cannot send for it, and nothing links to it.
 * While on, such pads are still noindex and are not listed on /pads, in the menu or anywhere public.
 */
export function meetingPadsPreviewEnabled(): boolean {
  if ((process.env.MEETING_PADS_PREVIEW || '').trim().toLowerCase() !== 'on') return false;
  const dpEnv = (process.env.DP_ENV || '').trim().toLowerCase();
  if (dpEnv === 'prod' || dpEnv === 'production') return false;
  return true;
}

/** Whether this pad may be served on this deployment: always when public, otherwise only while the preview is on. */
export function meetingPadServable(pad: MeetingPad): boolean {
  return isMeetingPadPublic(pad) || meetingPadsPreviewEnabled();
}
