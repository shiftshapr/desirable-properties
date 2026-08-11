import { hermesUpstreamHeaders } from '@/lib/hermes-proxy';
import type { HermesAmbientMode } from '@/lib/hermes-ambient-types';
import { getHermesChatUrl } from '@/lib/web3auth-config';

export type AmbientAssessResult = {
  shouldRaise: boolean;
  confidence: number;
  mode: HermesAmbientMode | null;
  teaser: string | null;
  reason?: string;
  explicit?: boolean;
};

export async function callHermesAmbientAssess(input: {
  newMessage: { body: string };
  recentMessages: Array<{ author_name?: string; body: string }>;
  allowedModes: HermesAmbientMode[];
  explicitRequest?: { mode: HermesAmbientMode; explicit: boolean } | null;
}): Promise<AmbientAssessResult | null> {
  const upstream = await fetch(`${getHermesChatUrl()}/api/hermes/ambient/assess`, {
    method: 'POST',
    headers: hermesUpstreamHeaders(),
    body: JSON.stringify({
      newMessage: input.newMessage,
      recentMessages: input.recentMessages,
      allowedModes: input.allowedModes,
      explicitRequest: input.explicitRequest || null,
    }),
    signal: AbortSignal.timeout(50000),
  });

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Hermes assess failed');
  }
  return (data.assessment as AmbientAssessResult) || null;
}

export async function callHermesAmbientReply(input: {
  mode: HermesAmbientMode;
  newMessage: { body: string };
  recentMessages: Array<{ author_name?: string; body: string }>;
  dpFocus?: number | null;
  workgroupSlug?: string;
}): Promise<{ reply: string; mode: HermesAmbientMode; modeLabel: string }> {
  const surface = input.workgroupSlug
    ? `desirableproperties.org/workgroups/${input.workgroupSlug}`
    : 'desirableproperties.org/workgroups';

  const upstream = await fetch(`${getHermesChatUrl()}/api/hermes/ambient/reply`, {
    method: 'POST',
    headers: hermesUpstreamHeaders(),
    body: JSON.stringify({
      mode: input.mode,
      newMessage: input.newMessage,
      recentMessages: input.recentMessages,
      dpFocus: input.dpFocus ?? null,
      surface,
    }),
    signal: AbortSignal.timeout(95000),
  });

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Hermes reply failed');
  }
  return data as { reply: string; mode: HermesAmbientMode; modeLabel: string };
}

export function parseExplicitHermesRequest(message: string): {
  mode: HermesAmbientMode;
  explicit: boolean;
} | null {
  const text = String(message || '').trim();
  if (!text) return null;

  const lower = text.toLowerCase();
  if (!/@hermes\b/.test(lower) && !/\bhermes[,:]/.test(lower)) {
    return null;
  }

  if (/devil['']?s?\s+advocate/i.test(text)) {
    return { mode: 'devils_advocate', explicit: true };
  }
  if (/\bfacilitator\b/i.test(text)) {
    return { mode: 'facilitator', explicit: true };
  }
  if (/\bobserver\b/i.test(text)) {
    return { mode: 'observer', explicit: true };
  }
  return { mode: 'facilitator', explicit: true };
}
