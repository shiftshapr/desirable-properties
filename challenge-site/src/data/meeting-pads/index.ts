import type { MeetingPad } from '@/lib/meeting-pads/types';
import { MEETING_PAD_2026_11_20_SESSION_PAGE_REVIEW } from '@/data/meeting-pads/2026-11-20-session-page-review';

/**
 * Every meeting pad, newest first. Add a pad: one data file in this folder (same shape, MeetingPad) and one line
 * here. Nothing lists these pads publicly while they are a preview (src/lib/meeting-pads/flag.ts).
 */
export const MEETING_PADS: MeetingPad[] = [MEETING_PAD_2026_11_20_SESSION_PAGE_REVIEW];

export function getMeetingPad(slug: string): MeetingPad | null {
  return MEETING_PADS.find((p) => p.slug === slug) ?? null;
}
