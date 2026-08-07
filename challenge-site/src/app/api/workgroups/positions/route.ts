import { proxyGovHubJson } from '@/lib/govhub-proxy';

/** Public list of nominatable workgroup position types. */
export async function GET() {
  return proxyGovHubJson('/api/workgroups/positions/', {
    requireAuth: false,
    method: 'GET',
  });
}
