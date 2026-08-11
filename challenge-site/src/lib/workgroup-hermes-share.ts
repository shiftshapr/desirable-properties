/** Shared Hermes posts use this prefix when posted to the workgroup thread. */
export const SHARED_HERMES_MESSAGE_PREFIX = '✋ *Hermes (';

const SHARED_HERMES_MESSAGE_RE = /^✋\s+\*Hermes \([^)]+\)\*/;

/** True when a workgroup message body was shared from Hermes (ambient hand or Ask Hermes). */
export function isSharedHermesWorkgroupMessage(body: string): boolean {
  return SHARED_HERMES_MESSAGE_RE.test(String(body ?? '').trimStart());
}
