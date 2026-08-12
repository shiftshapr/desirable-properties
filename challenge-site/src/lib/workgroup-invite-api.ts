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
  if (data.already_accepted && data.valid) {
    return data as WorkgroupInvitePreview;
  }
  if (!res.ok || !data.valid) {
    throw new Error(String(data.error || 'Invalid invitation'));
  }
  return data as WorkgroupInvitePreview;
}

export async function isInviteSessionAuthenticated(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
    const data = await parseJson(res);
    return res.ok && Boolean(data.authenticated);
  } catch {
    return false;
  }
}

export async function acceptWorkgroupInvite(
  token: string,
  options?: { retryOn401?: boolean },
): Promise<WorkgroupInviteAcceptResult> {
  const res = await fetch(`/api/invitations/by-token/${encodeURIComponent(token)}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: '{}',
    cache: 'no-store',
  });
  const data = await parseJson(res);
  if (res.status === 401 && !options?.retryOn401) {
    const authed = await isInviteSessionAuthenticated();
    if (authed) {
      return acceptWorkgroupInvite(token, { retryOn401: true });
    }
  }
  if (!res.ok) {
    const message = String(data.error || 'Could not accept invitation');
    if (
      data.already_accepted ||
      message.toLowerCase().includes('invitation is accepted')
    ) {
      return {
        success: true,
        already_accepted: true,
        redirect_path: typeof data.redirect_path === 'string' ? data.redirect_path : undefined,
      };
    }
    throw new Error(message);
  }
  return data as WorkgroupInviteAcceptResult;
}
