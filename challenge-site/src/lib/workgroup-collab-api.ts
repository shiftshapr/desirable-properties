import type {
  InviteDraftInput,
  InviteDraftResponse,
  InviteResearchInput,
  InviteResearchResponse,
  InviteSendInput,
  InviteSendResponse,
  WorkgroupCollabSummary,
  WorkgroupMessagesResponse,
} from '@/lib/workgroup-collab-types';

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    const err = typeof data?.error === 'string' ? data.error : `Request failed (${res.status})`;
    throw new Error(err);
  }
  return data;
}

/** Client-side helpers calling same-origin challenge-site proxy routes. */
export async function fetchWorkgroupMessages(
  workgroupId: string,
  opts?: { full?: boolean },
): Promise<WorkgroupMessagesResponse> {
  const qs = opts?.full ? '?full=1' : '';
  const res = await fetch(`/api/workgroups/${encodeURIComponent(workgroupId)}/messages${qs}`, {
    credentials: 'include',
    cache: 'no-store',
  });
  return parseJson<WorkgroupMessagesResponse>(res);
}

export async function postWorkgroupMessage(
  workgroupId: string,
  body: string,
): Promise<{ success?: boolean; message?: WorkgroupMessagesResponse['messages'][number]; error?: string }> {
  const res = await fetch(`/api/workgroups/${encodeURIComponent(workgroupId)}/messages`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  });
  return parseJson(res);
}

export async function inviteAiResearch(
  workgroupId: string,
  input: InviteResearchInput,
): Promise<InviteResearchResponse> {
  const res = await fetch(
    `/api/workgroups/${encodeURIComponent(workgroupId)}/invite-ai/research`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  );
  return parseJson<InviteResearchResponse>(res);
}

export async function inviteAiDraft(
  workgroupId: string,
  input: InviteDraftInput,
): Promise<InviteDraftResponse> {
  const res = await fetch(`/api/workgroups/${encodeURIComponent(workgroupId)}/invite-ai/draft`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseJson<InviteDraftResponse>(res);
}

export async function inviteAiSend(
  workgroupId: string,
  input: InviteSendInput,
): Promise<InviteSendResponse> {
  const res = await fetch(`/api/workgroups/${encodeURIComponent(workgroupId)}/invite-ai/send`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseJson<InviteSendResponse>(res);
}

export async function joinWorkgroup(
  workgroupId: string,
): Promise<{ success?: boolean; message?: string; pending_approval?: boolean; welcome_url?: string }> {
  const res = await fetch(`/api/workgroups/${encodeURIComponent(workgroupId)}/join`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  return parseJson(res);
}

export async function leaveWorkgroup(
  workgroupId: string,
): Promise<{
  success?: boolean;
  message?: string;
  left?: boolean;
  cancelled_request?: boolean;
}> {
  const res = await fetch(`/api/workgroups/${encodeURIComponent(workgroupId)}/leave`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  return parseJson(res);
}

export type NominatePayload = {
  position_key?: string;
  position?: string;
  nominee_name: string;
  nominee_email: string;
  nominee_profile_url: string;
  statement: string;
  nominee_user_id?: string;
};

export async function nominateWorkgroupPosition(
  workgroupId: string,
  payload: NominatePayload,
): Promise<{ success?: boolean; message?: string }> {
  const res = await fetch(`/api/workgroups/${encodeURIComponent(workgroupId)}/nominate`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function fetchWorkgroupPositions(): Promise<{
  positions: Array<{
    key?: string;
    position_key?: string;
    label?: string;
    position_label?: string;
    description?: string;
  }>;
}> {
  const res = await fetch('/api/workgroups/positions', {
    credentials: 'include',
    cache: 'no-store',
  });
  return parseJson(res);
}

export type { WorkgroupCollabSummary };

export type WorkgroupRosterMember = {
  user_id: string;
  user_name: string;
  positions: string[];
  is_facilitator: boolean;
};

export async function fetchWorkgroupMemberRoster(
  workgroupId: string,
): Promise<{ members: WorkgroupRosterMember[] }> {
  const res = await fetch(
    `/api/workgroups/${encodeURIComponent(workgroupId)}/members/roster`,
    { credentials: 'include', cache: 'no-store' },
  );
  return parseJson(res);
}

export async function shareWorkgroupMessage(
  workgroupId: string,
  messageId: string,
  input: {
    recipient: string;
    sendeeRole?: 'watcher' | 'controller';
    note?: string;
  },
): Promise<{
  share: { id: string; sendeeRole: string };
  recipient: { user_id: string; user_name: string };
}> {
  const res = await fetch(
    `/api/workgroups/${encodeURIComponent(workgroupId)}/messages/${encodeURIComponent(messageId)}/shares`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  );
  return parseJson(res);
}
