import { GOVHUB_PUBLIC_BASE_URL } from '@/lib/govhub';

/** Resolve Gov Hub invite preview to an on-site path (pathname + search). */
export async function resolveWorkgroupInviteLandingPath(token: string): Promise<string | null> {
  const trimmed = token.trim();
  if (!trimmed) return null;

  try {
    const res = await fetch(
      `${GOVHUB_PUBLIC_BASE_URL}/api/invitations/by-token/${encodeURIComponent(trimmed)}/`,
      { cache: 'no-store' },
    );
    if (!res.ok) return null;

    const data = (await res.json()) as { valid?: boolean; landing_path?: string };
    if (!data.valid || !data.landing_path?.trim()) return null;

    const landing = data.landing_path.trim();
    if (landing.startsWith('/')) return landing;

    try {
      const url = new URL(landing);
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}
