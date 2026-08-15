import { proxyDpAdminInviteGovHub } from '@/lib/dp-admin-invite-proxy';

export async function GET() {
  return proxyDpAdminInviteGovHub('/api/admin/dp-invite/dispatch/draft/status/', {
    method: 'GET',
    timeoutMs: 30000,
  });
}
