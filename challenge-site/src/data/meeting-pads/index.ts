import { isMeetingPadPublic, type MeetingPad } from '@/lib/meeting-pads/types';
import { MEETING_PAD_2026_11_20_SESSION_PAGE_REVIEW } from '@/data/meeting-pads/2026-11-20-session-page-review';

/**
 * Every meeting pad, newest first. Add a pad: one data file in this folder (same shape, MeetingPad) and one line
 * here. Only public pads (isMeetingPadPublic: visibility 'public' and every non-host participant consented) are listed
 * anywhere; the rest are a staging preview (src/lib/meeting-pads/flag.ts).
 */
export const MEETING_PADS: MeetingPad[] = [MEETING_PAD_2026_11_20_SESSION_PAGE_REVIEW];

export function getMeetingPad(slug: string): MeetingPad | null {
  return MEETING_PADS.find((p) => p.slug === slug) ?? null;
}

/** Public meeting pads, newest first: the only ones listed on /pads or anywhere else. */
export function publicMeetingPads(): MeetingPad[] {
  return MEETING_PADS.filter(isMeetingPadPublic).sort((a, b) => b.date.localeCompare(a.date));
}
