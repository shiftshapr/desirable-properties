import { proxyDpAdminInviteGovHub } from '@/lib/dp-admin-invite-proxy';

export async function POST(request: Request) {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  return proxyDpAdminInviteGovHub('/api/admin/dp-invite/pathways/zoho/', {
    method: 'POST',
    body,
    timeoutMs: 90000,
  });
}
