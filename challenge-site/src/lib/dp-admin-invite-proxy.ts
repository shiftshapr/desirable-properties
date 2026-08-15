import { proxyGovHubJson } from '@/lib/govhub-proxy';
import { requireDpAdminForGovHubProxy } from '@/lib/dp-admin-api';

type ProxyOptions = {
  method?: string;
  body?: unknown;
  searchParams?: URLSearchParams | string;
  timeoutMs?: number;
};

/** Proxy DP admin invite routes to Gov Hub using server-to-server auth. */
export async function proxyDpAdminInviteGovHub(path: string, options: ProxyOptions = {}) {
  const auth = await requireDpAdminForGovHubProxy();
  if (!auth.ok) return auth.response;
  return proxyGovHubJson(path, {
    ...options,
    requireAuth: false,
    adminEmail: auth.email,
  });
}
