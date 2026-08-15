import { proxyDpAdminInviteGovHub } from '@/lib/dp-admin-invite-proxy';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const recipientEmail = url.searchParams.get('recipient_email') || '';
  const limit = url.searchParams.get('limit') || '50';
  const query = new URLSearchParams({ limit });
  if (recipientEmail) query.set('recipient_email', recipientEmail);
  return proxyDpAdminInviteGovHub(`/api/admin/dp-invite/send-records/?${query.toString()}`, {
    method: 'GET',
    timeoutMs: 30000,
  });
}
