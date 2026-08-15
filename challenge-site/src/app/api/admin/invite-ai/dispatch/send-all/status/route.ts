import { proxyDpAdminInviteGovHub } from '@/lib/dp-admin-invite-proxy';

export async function GET() {
  return proxyDpAdminInviteGovHub('/api/admin/dp-invite/dispatch/send-all/status/', {
    method: 'GET',
    timeoutMs: 30000,
  });
}
