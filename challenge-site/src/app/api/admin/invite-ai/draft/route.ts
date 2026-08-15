import { proxyDpAdminInviteGovHub } from '@/lib/dp-admin-invite-proxy';

export async function POST(request: Request) {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  return proxyDpAdminInviteGovHub('/api/admin/dp-invite/draft/', {
    method: 'POST',
    body,
    timeoutMs: 90000,
  });
}
