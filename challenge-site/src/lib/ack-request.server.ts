import 'server-only';
import { GOVHUB_PUBLIC_BASE_URL } from '@/lib/govhub';
import { getGovHubProxyBaseUrl } from '@/lib/web3auth-config';

export type AckRequestSummary = { newCount: number; reviewUrl: string };

/** New Acknowledgements requests, for a viewer Gov Hub lets review them (steering, super admins); else null. */
export async function fetchAckRequestSummary(idToken: string): Promise<AckRequestSummary | null> {
  try {
    const res = await fetch(`${getGovHubProxyBaseUrl()}/api/dp/acknowledgements/requests/summary/`, {
      cache: 'no-store',
      headers: { Accept: 'application/json', Authorization: `Bearer ${idToken}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => ({}))) as {
      viewer_can_review?: boolean; new?: number; review_path?: string;
    };
    if (!data.viewer_can_review) return null;
    return {
      newCount: Number(data.new) || 0,
      reviewUrl: `${GOVHUB_PUBLIC_BASE_URL}${data.review_path || '/dp/acknowledgements/requests/'}`,
    };
  } catch {
    return null;
  }
}
