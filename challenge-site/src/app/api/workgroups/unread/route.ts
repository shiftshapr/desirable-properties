import { proxyGovHubJson } from '@/lib/govhub-proxy';

/** Unread chat messages across the signed-in member's workgroups (Gov Hub read cursors). */
export async function GET() {
  return proxyGovHubJson('/api/workgroups/unread/', { requireAuth: true, method: 'GET' });
}
