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

const SHARED_QUESTION_MAX_CHARS = 600;

/**
 * Body for a shared Ask Deepi reply. The room sees the answer without the prompt otherwise,
 * so the participant's question leads as a blockquote.
 */
export function buildSharedAskBody(opts: {
  modeLabel: string;
  reply: string;
  question?: string | null;
  promptLabel?: string | null;
}): string {
  const header = `${SHARED_DEEPI_MESSAGE_PREFIX}${opts.modeLabel})*`;
  const asked = String(opts.question || opts.promptLabel || '').trim();
  const reply = String(opts.reply || '').trim();
  if (!asked) return `${header}\n\n${reply}`;

  const trimmed =
    asked.length > SHARED_QUESTION_MAX_CHARS
      ? `${asked.slice(0, SHARED_QUESTION_MAX_CHARS).trimEnd()}…`
      : asked;
  const quoted = trimmed
    .split('\n')
    .map((line) => `> ${line}`.trimEnd())
    .join('\n');

  return `${header}\n\n> **Asked:**\n${quoted}\n\n${reply}`;
}
