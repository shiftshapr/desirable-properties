import { proxyDpAdminInviteGovHub } from '@/lib/dp-admin-invite-proxy';

export async function GET() {
  return proxyDpAdminInviteGovHub('/api/admin/dp-invite/contacts/selection/', {
    method: 'GET',
    timeoutMs: 30000,
  });
}

export async function POST(request: Request) {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  return proxyDpAdminInviteGovHub('/api/admin/dp-invite/contacts/selection/', {
    method: 'POST',
    body,
    timeoutMs: 30000,
  });
}

export async function PATCH(request: Request) {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  return proxyDpAdminInviteGovHub('/api/admin/dp-invite/contacts/selection/', {
    method: 'PATCH',
    body,
    timeoutMs: 30000,
  });
}
