import { DP_COMMUNITY_AI } from '@/lib/dp-community-ai';

/** Shared Deepi posts use this prefix when posted to the workgroup thread. */
export const SHARED_DEEPI_MESSAGE_PREFIX = `✋ *${DP_COMMUNITY_AI.name} (`;

/** @deprecated Legacy prefix; kept for detection on older messages. */
export const SHARED_HERMES_MESSAGE_PREFIX = '✋ *Hermes (';

const SHARED_DEEPI_MESSAGE_RE = /^✋\s+\*(?:Hermes|Deepi) \([^)]+\)\*/;

/** True when a workgroup message body was shared from Deepi (ambient hand or Ask Deepi). */
export function isSharedHermesWorkgroupMessage(body: string): boolean {
  return SHARED_DEEPI_MESSAGE_RE.test(String(body ?? '').trimStart());
}
