import { GOVHUB_PUBLIC_BASE_URL } from '@/lib/govhub';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Resolve a workgroup route param (UUID or Gov Hub slug) to the canonical workgroup id. */
export async function resolveWorkgroupRouteId(idOrSlug: string): Promise<string | null> {
  const raw = String(idOrSlug || '').trim();
  if (!raw) return null;
  if (UUID_RE.test(raw)) return raw;

  try {
    const res = await fetch(
      `${GOVHUB_PUBLIC_BASE_URL}/api/workgroups/by-slug/${encodeURIComponent(raw)}/`,
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { id?: string };
    const id = String(data.id || '').trim();
    return id || null;
  } catch {
    return null;
  }
}
