import type { HermesAmbientMode, HermesHand, HermesWorkgroupSettings } from '@/lib/hermes-ambient-types';
import { DEFAULT_HERMES_WORKGROUP_SETTINGS } from '@/lib/hermes-ambient-types';

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    const err = typeof data?.error === 'string' ? data.error : `Request failed (${res.status})`;
    throw new Error(err);
  }
  return data;
}

function communityPath(threadId: string, suffix = '') {
  return `/api/agent/community-threads/${encodeURIComponent(threadId)}${suffix}`;
}

export async function fetchCommunityHermesHands(threadId: string): Promise<{
  hands: HermesHand[];
  pending: HermesHand[];
  configured: boolean;
}> {
  const res = await fetch(communityPath(threadId, '/hermes/hands'), {
    credentials: 'include',
    cache: 'no-store',
  });
  return parseJson(res);
}

export async function assessCommunityHermesAmbient(
  threadId: string,
  input: {
    messageId: string;
    messageBody: string;
    authorUserId: string;
    recentMessages: Array<{ id?: string; author_name?: string; body: string }>;
  },
): Promise<{ hand: HermesHand | null }> {
  const res = await fetch(communityPath(threadId, '/hermes/assess'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseJson(res);
}

export async function openCommunityHermesHand(
  threadId: string,
  handId: string,
  input: { dpFocus?: number | null; recentMessages: Array<{ author_name?: string; body: string }> },
): Promise<{ hand: HermesHand }> {
  const res = await fetch(
    communityPath(threadId, `/hermes/hands/${encodeURIComponent(handId)}/open`),
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  );
  return parseJson(res);
}

export async function shareCommunityHermesHand(
  threadId: string,
  handId: string,
): Promise<{ hand: HermesHand }> {
  const res = await fetch(
    communityPath(threadId, `/hermes/hands/${encodeURIComponent(handId)}/share`),
    { method: 'POST', credentials: 'include' },
  );
  return parseJson(res);
}

export async function dismissCommunityHermesHand(
  threadId: string,
  handId: string,
): Promise<{ hand: HermesHand }> {
  const res = await fetch(
    communityPath(threadId, `/hermes/hands/${encodeURIComponent(handId)}/dismiss`),
    { method: 'POST', credentials: 'include' },
  );
  return parseJson(res);
}

export async function fetchCommunityHermesSettings(threadId: string): Promise<{
  settings: HermesWorkgroupSettings | null;
  configured: boolean;
}> {
  return {
    settings: {
      workgroupId: threadId,
      ...DEFAULT_HERMES_WORKGROUP_SETTINGS,
      updatedAt: null,
      updatedBy: null,
    },
    configured: true,
  };
}

export async function updateCommunityHermesSettings(
  _threadId: string,
  _patch: Partial<{
    confidenceThreshold: number;
    allowedModes: HermesAmbientMode[];
    cooldownMinutes: number;
    devilsAdvocateMode: 'request_only' | 'facilitator_enabled';
  }>,
): Promise<{ settings: HermesWorkgroupSettings }> {
  throw new Error('Community ambient settings are not configurable in this version');
}
