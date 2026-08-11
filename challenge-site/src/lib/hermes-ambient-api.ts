import type { HermesAmbientMode, HermesHand, HermesWorkgroupSettings } from '@/lib/hermes-ambient-types';

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    const err = typeof data?.error === 'string' ? data.error : `Request failed (${res.status})`;
    throw new Error(err);
  }
  return data;
}

export async function fetchHermesHands(workgroupId: string): Promise<{
  hands: HermesHand[];
  pending: HermesHand[];
  configured: boolean;
}> {
  const res = await fetch(`/api/workgroups/${encodeURIComponent(workgroupId)}/hermes/hands`, {
    credentials: 'include',
    cache: 'no-store',
  });
  return parseJson(res);
}

export async function assessHermesAmbient(
  workgroupId: string,
  input: {
    messageId: string;
    messageBody: string;
    authorUserId: string;
    recentMessages: Array<{ id?: string; author_name?: string; body: string }>;
  },
): Promise<{ hand: HermesHand | null }> {
  const res = await fetch(`/api/workgroups/${encodeURIComponent(workgroupId)}/hermes/assess`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseJson(res);
}

export async function openHermesHand(
  workgroupId: string,
  handId: string,
  input: { workgroupSlug: string; dpFocus?: number | null; recentMessages: Array<{ author_name?: string; body: string }> },
): Promise<{ hand: HermesHand }> {
  const res = await fetch(
    `/api/workgroups/${encodeURIComponent(workgroupId)}/hermes/hands/${encodeURIComponent(handId)}/open`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  );
  return parseJson(res);
}

export async function shareHermesHand(
  workgroupId: string,
  handId: string,
): Promise<{ hand: HermesHand }> {
  const res = await fetch(
    `/api/workgroups/${encodeURIComponent(workgroupId)}/hermes/hands/${encodeURIComponent(handId)}/share`,
    {
      method: 'POST',
      credentials: 'include',
    },
  );
  return parseJson(res);
}

export async function dismissHermesHand(
  workgroupId: string,
  handId: string,
): Promise<{ hand: HermesHand }> {
  const res = await fetch(
    `/api/workgroups/${encodeURIComponent(workgroupId)}/hermes/hands/${encodeURIComponent(handId)}/dismiss`,
    {
      method: 'POST',
      credentials: 'include',
    },
  );
  return parseJson(res);
}

export async function fetchHermesSettings(workgroupId: string): Promise<{
  settings: HermesWorkgroupSettings | null;
  configured: boolean;
}> {
  const res = await fetch(`/api/workgroups/${encodeURIComponent(workgroupId)}/hermes/settings`, {
    credentials: 'include',
    cache: 'no-store',
  });
  return parseJson(res);
}

export async function updateHermesSettings(
  workgroupId: string,
  patch: Partial<{
    confidenceThreshold: number;
    allowedModes: HermesAmbientMode[];
    cooldownMinutes: number;
    devilsAdvocateMode: 'request_only' | 'facilitator_enabled';
  }>,
): Promise<{ settings: HermesWorkgroupSettings }> {
  const res = await fetch(`/api/workgroups/${encodeURIComponent(workgroupId)}/hermes/settings`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  return parseJson(res);
}
