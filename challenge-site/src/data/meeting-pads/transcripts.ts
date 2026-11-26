import type { MeetingPadTranscript } from '@/lib/meeting-pads/types';
import sessionPageReview from '@/data/meeting-pads/2026-11-20-session-page-review.transcript.json';
import agentsAndStories from '@/data/meeting-pads/2026-11-25-agents-and-stories.transcript.json';

/**
 * Meeting pad transcripts, by pad slug. Kept apart from the pad data (src/data/meeting-pads/index.ts) so /pads and the
 * invite code do not load them; only the pad page does. Add one only when every participant in it has consented to
 * the transcript being published. Profanity and crude examples are replaced with "[a passage is left out here]".
 */
const TRANSCRIPTS: Record<string, MeetingPadTranscript> = {
  '2026-11-20-session-page-review': sessionPageReview as MeetingPadTranscript,
  '2026-11-25-agents-and-stories': agentsAndStories as MeetingPadTranscript,
};

export function getMeetingPadTranscript(slug: string): MeetingPadTranscript | null {
  return TRANSCRIPTS[slug] ?? null;
}
