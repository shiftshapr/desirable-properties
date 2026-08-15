import { proxyDpAdminInviteGovHub } from '@/lib/dp-admin-invite-proxy';

export async function GET() {
  return proxyDpAdminInviteGovHub('/api/admin/dp-invite/dispatch/template/', {
    method: 'GET',
    timeoutMs: 60000,
  });
}
