import { GOVHUB_PUBLIC_BASE_URL } from '@/lib/govhub';

type WorkgroupLookup = {
  name: string;
  slug: string;
};

export function getRequestedWorkgroupSlug(value: string | string[] | undefined): string | null {
  if (typeof value !== 'string') return null;
  const slug = value.trim();
  return /^[A-Za-z0-9_-]{1,120}$/.test(slug) ? slug : null;
}

export async function fetchWorkgroupBySlug(slug: string): Promise<WorkgroupLookup | null> {
  const normalized = slug.trim();
  if (!normalized) return null;
  try {
    const res = await fetch(
      `${GOVHUB_PUBLIC_BASE_URL}/api/workgroups/by-slug/${encodeURIComponent(normalized)}/`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { name?: string; slug?: string };
    if (!data?.name) return null;
    return { name: data.name, slug: data.slug || normalized };
  } catch {
    return null;
  }
}
