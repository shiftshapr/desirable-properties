import { proxyGovHubJson } from '@/lib/govhub-proxy';
import { requireDpAdminWithSession } from '@/lib/dp-admin-api';

export async function GET(request: Request) {
  const auth = await requireDpAdminWithSession();
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const recipientEmail = url.searchParams.get('recipient_email') || '';
  const limit = url.searchParams.get('limit') || '50';
  const query = new URLSearchParams({ limit });
  if (recipientEmail) query.set('recipient_email', recipientEmail);
  return proxyGovHubJson(`/api/admin/dp-invite/send-records/?${query.toString()}`, {
    requireAuth: true,
    method: 'GET',
    timeoutMs: 30000,
  });
}
