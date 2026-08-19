export type ControlRequestSummary = {
  id: string;
  status: string;
  createdAt: string | null;
  requesterName: string | null;
  requesterEmail: string | null;
  requesterVerifierId: string | null;
};

export async function acceptThreadControl(threadId: string): Promise<{ ok?: boolean; error?: string }> {
  const res = await fetch(`/api/agent/threads/${encodeURIComponent(threadId)}/control/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not accept control');
  return data;
}

export async function requestThreadControl(threadId: string): Promise<{ ok?: boolean; error?: string }> {
  const res = await fetch(`/api/agent/threads/${encodeURIComponent(threadId)}/control/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not request control');
  return data;
}

export async function listThreadControlRequests(threadId: string): Promise<ControlRequestSummary[]> {
  const res = await fetch(`/api/agent/threads/${encodeURIComponent(threadId)}/control/requests`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return [];
  return Array.isArray(data.requests) ? data.requests : [];
}

export async function resolveControlRequest(
  threadId: string,
  requestId: string,
  action: 'approve' | 'deny',
): Promise<void> {
  const res = await fetch(
    `/api/agent/threads/${encodeURIComponent(threadId)}/control/requests/${encodeURIComponent(requestId)}/resolve`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not resolve request');
}
