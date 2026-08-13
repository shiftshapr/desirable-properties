import { proxyGovHubJson } from '@/lib/govhub-proxy';
import { requireDpAdminWithSession } from '@/lib/dp-admin-api';

async function proxyInvite(path: string, request: Request, method: 'GET' | 'POST' = 'POST') {
  const auth = await requireDpAdminWithSession();
  if (!auth.ok) return auth.response;
  let body: unknown = undefined;
  if (method === 'POST') {
    try {
      body = await request.json();
    } catch {
      body = {};
    }
  }
  return proxyGovHubJson(path, {
    requireAuth: true,
    method,
    body,
    timeoutMs: 120000,
  });
}

export async function POST(request: Request) {
  return proxyInvite('/api/admin/dp-invite/ingest-zoho/', request);
}
