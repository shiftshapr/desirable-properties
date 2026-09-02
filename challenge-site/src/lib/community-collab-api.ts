import type {
  CommunityChatMessage,
  CommunityMessagesPayload,
} from '@/lib/community-collab-types';

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    const err = typeof data?.error === 'string' ? data.error : `Request failed (${res.status})`;
    throw new Error(err);
  }
  return data;
}

export async function fetchCommunityMessages(
  threadId: string,
  opts?: { full?: boolean },
): Promise<CommunityMessagesPayload> {
  const qs = opts?.full ? '?full=1' : '';
  const res = await fetch(
    `/api/agent/community-threads/${encodeURIComponent(threadId)}/messages${qs}`,
    { credentials: 'include', cache: 'no-store' },
  );
  return parseJson<CommunityMessagesPayload>(res);
}

export async function postCommunityMessage(
  threadId: string,
  body: string,
): Promise<{ message?: CommunityChatMessage }> {
  const res = await fetch(
    `/api/agent/community-threads/${encodeURIComponent(threadId)}/messages`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    },
  );
  return parseJson(res);
}

export async function patchCommunityMessage(
  threadId: string,
  messageId: string,
  body: string,
): Promise<{ message?: CommunityChatMessage }> {
  const res = await fetch(
    `/api/agent/community-threads/${encodeURIComponent(threadId)}/messages/${encodeURIComponent(messageId)}`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    },
  );
  return parseJson(res);
}

export type { CommunityChatMessage, CommunityMessagesPayload };
