import { getCanopiAppBase, getCanopiApiBase, fetchCanopiUserProfile } from '@/lib/canopi-api';
import { resolveAvatarUrl } from '@/lib/avatar';
import { resolveCanopiUserServer } from '@/lib/dp-canopi-user-search';

export type CanopiPublicProfile = {
  id: string;
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  profileUrl: string;
};

export function buildCanopiProfileUrl(handle: string): string {
  const handleValue = String(handle || '').trim().replace(/^@+/, '');
  if (!handleValue) return '';
  const appBase = getCanopiAppBase().replace(/\/$/, '');
  const profileHost = appBase.includes('app.canopi.live') ? 'https://canopi.live' : appBase;
  return `${profileHost}/p/${encodeURIComponent(handleValue)}`;
}

function profileFromCanopiUser(data: {
  id?: string;
  handle?: string | null;
  displayName?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
}): CanopiPublicProfile | null {
  const handle = String(data.handle || '').trim();
  if (!handle) return null;
  return {
    id: String(data.id || ''),
    handle,
    displayName: data.displayName ? String(data.displayName) : data.name ? String(data.name) : null,
    avatarUrl: data.avatarUrl ? String(data.avatarUrl) : null,
    profileUrl: buildCanopiProfileUrl(handle),
  };
}

/** Public Canopi profile by @handle. */
export async function fetchCanopiProfileByHandle(
  handle: string,
): Promise<CanopiPublicProfile | null> {
  const h = String(handle || '').trim().replace(/^@/, '').toLowerCase();
  if (!h) return null;

  try {
    const res = await fetch(
      `${getCanopiApiBase()}/v1/users/by-handle/${encodeURIComponent(h)}`,
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
        next: { revalidate: 300 },
      },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.handle) return null;
    return profileFromCanopiUser(data);
  } catch {
    return null;
  }
}

/** Resolve a Canopi public profile from account email (METAWEB_OPS_SECRET). */
export async function fetchCanopiProfileByEmail(
  email: string,
): Promise<CanopiPublicProfile | null> {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized.includes('@')) return null;

  const resolved = await resolveCanopiUserServer({ email: normalized });
  if (!resolved?.userId) return null;

  const user = await fetchCanopiUserProfile(resolved.userId);
  if (!user?.handle) return null;
  return profileFromCanopiUser(user);
}

export function canopiAvatarSrc(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl) return null;
  return resolveAvatarUrl(avatarUrl);
}
