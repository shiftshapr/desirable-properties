import type { WorkgroupInviteAcceptResult, WorkgroupInvitePreview } from '@/lib/workgroup-collab-types';

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error('Unexpected server response. Please try again.');
  }
}

export async function fetchWorkgroupInvitePreview(token: string): Promise<WorkgroupInvitePreview> {
  const res = await fetch(`/api/invitations/by-token/${encodeURIComponent(token)}`, {
    credentials: 'include',
    cache: 'no-store',
  });
  const data = await parseJson(res);
  if (!res.ok || !data.valid) {
    throw new Error(String(data.error || 'Invalid invitation'));
  }
  return data as WorkgroupInvitePreview;
}

export async function acceptWorkgroupInvite(token: string): Promise<WorkgroupInviteAcceptResult> {
  const res = await fetch(`/api/invitations/by-token/${encodeURIComponent(token)}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: '{}',
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(String(data.error || 'Could not accept invitation'));
  }
  return data as WorkgroupInviteAcceptResult;
}
