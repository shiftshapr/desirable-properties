import { proxyGovHubJson } from '@/lib/govhub-proxy';
import { requireDpAdminWithSession } from '@/lib/dp-admin-api';

export async function POST(request: Request) {
  const auth = await requireDpAdminWithSession();
  if (!auth.ok) return auth.response;
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  return proxyGovHubJson('/api/admin/dp-invite/batch/history/', {
    requireAuth: true,
    method: 'POST',
    body,
    timeoutMs: 30000,
  });
}
