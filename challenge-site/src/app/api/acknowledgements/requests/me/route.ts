import { proxyGovHubJson } from '@/lib/govhub-proxy';

/** What Gov Hub knows about the signed-in person (name, email, current entry), to fill the form. */
export async function GET() {
  return proxyGovHubJson('/api/dp/acknowledgements/requests/me/', { requireAuth: true, timeoutMs: 15000 });
}
