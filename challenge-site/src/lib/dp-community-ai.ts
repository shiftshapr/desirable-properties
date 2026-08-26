/** DP Community AI display copy (Deepi). Single source for site + embed UI strings. */
export const DP_COMMUNITY_AI_REALM = 'dp' as const;

export const DP_COMMUNITY_AI = {
  name: 'Deepi',
  tagline: 'DP Community AI',
  realm: DP_COMMUNITY_AI_REALM,
} as const;

export const DP_COMMUNITY_AI_ERRORS = {
  upstream_timeout:
    "Deepi couldn't reach the server. Hard-refresh the page and try again. If it keeps failing, the reply may be timing out.",
  llm_failed:
    "Deepi couldn't respond right now. Your message wasn't lost. Try sending again.",
  unavailable: 'Deepi is unavailable right now. Try again in a moment.',
  invalid_response: 'Invalid response from Deepi.',
  stopped: 'Stopped before Deepi replied.',
  send_failed: 'Message not saved. Deepi did not receive this turn.',
  wait_for_reply: 'Wait for Deepi to finish replying before editing this message.',
  wait_for_reply_fork: 'Wait for Deepi to finish replying before forking from this message.',
  teach: 'Teach Deepi',
  messagePlaceholder: 'Message Deepi…',
  communityChatPlaceholder: 'Message Community Chat…',
} as const;

export const DP_COMMUNITY_AI_INTRO =
  "I'm Deepi, the DP Community AI. I help this community improve the Desirable Properties of a layered web: clarifying what they mean, surfacing tensions, and turning good arguments into patches. Sign in to chat. Your conversations are saved in the sidebar for future reference and continuing dialog.";

export function dpCommunityAiErrorFromMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/did not match the expected pattern/i.test(msg)) {
    return DP_COMMUNITY_AI_ERRORS.upstream_timeout;
  }
  if (/^LLM\b/.test(msg) || /fetch failed|network|timeout|aborted|load failed/i.test(msg)) {
    return DP_COMMUNITY_AI_ERRORS.llm_failed;
  }
  if (/jwt expired|session expired|sign in again/i.test(msg)) {
    return msg;
  }
  if (/internal server error/i.test(msg)) {
    return 'Publish failed on Canopi Discuss. Your sign-in may have expired. Sign in again and retry. If it persists, try Save to my drafts first.';
  }
  return msg;
}
