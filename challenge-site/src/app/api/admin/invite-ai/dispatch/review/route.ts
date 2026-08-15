import { proxyDpAdminInviteGovHub } from '@/lib/dp-admin-invite-proxy';

export async function GET() {
  return proxyDpAdminInviteGovHub('/api/admin/dp-invite/dispatch/review/', {
    method: 'GET',
    timeoutMs: 60000,
  });
}

export async function PATCH(request: Request) {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  return proxyDpAdminInviteGovHub('/api/admin/dp-invite/dispatch/review/', {
    method: 'PATCH',
    body,
    timeoutMs: 60000,
  });
}
