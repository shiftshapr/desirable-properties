import type { HermesSession } from '@/lib/auth-session';
import { isSyntheticAvatarUrl } from '@/lib/avatar';
import {
  fetchCanopiUserProfile,
  fetchCanopiWeb3AuthUser,
  getCanopiApiBase,
  type CanopiAuthUser,
} from '@/lib/canopi-api';

export function isUploadedProfileAvatar(url: string | null | undefined): boolean {
  const raw = String(url || '').trim();
  return raw.includes('.supabase.co/storage') && raw.includes('/avatars/');
}

export function isPlaceholderAvatar(url: string | null | undefined): boolean {
  const raw = String(url || '').trim();
  if (!raw) return true;
  return isSyntheticAvatarUrl(raw);
}

/** Prefer Canopi avatarUrl; keep Gov Hub uploads as fallback only. */
export function pickProfileImage(
  canopiAvatarUrl: string | null | undefined,
  fallbackImage: string | null | undefined,
): string | null {
  const canopi = String(canopiAvatarUrl || '').trim();
  const fallback = String(fallbackImage || '').trim();

  if (canopi && !isPlaceholderAvatar(canopi)) return canopi;
  if (isUploadedProfileAvatar(fallback)) return fallback;
  if (fallback && !isPlaceholderAvatar(fallback)) return fallback;
  return canopi || fallback || null;
}

async function resolveCanopiUser(session: HermesSession): Promise<CanopiAuthUser | null> {
  if (session.canopiUserId) {
    const profile = await fetchCanopiUserProfile(session.canopiUserId);
    if (profile?.id) return profile;
  }

  if (session.idToken) {
    const fromAuth = await fetchCanopiWeb3AuthUser(session.idToken);
    if (fromAuth?.id) return fromAuth;
  }

  if (session.username) {
    const byHandle = await fetchCanopiUserProfileByHandle(session.username);
    if (byHandle?.id) return byHandle;
  }

  return null;
}

async function fetchCanopiUserProfileByHandle(
  handle: string,
): Promise<CanopiAuthUser | null> {
  const h = String(handle || '').trim().replace(/^@+/, '');
  if (!h || h.includes('@')) return null;

  try {
    const res = await fetch(
      `${getCanopiApiBase()}/v1/users/by-handle/${encodeURIComponent(h)}`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    if (!data?.id) return null;
    return data as CanopiAuthUser;
  } catch {
    return null;
  }
}

export async function refreshSessionFromCanopi(session: HermesSession): Promise<{
  profileImage: string | null;
  canopiUserId: string | null;
  changed: boolean;
} | null> {
  const canopiUser = await resolveCanopiUser(session);
  if (!canopiUser?.id) return null;

  const profileImage = pickProfileImage(canopiUser.avatarUrl, session.profileImage);
  const canopiUserId = canopiUser.id;
  const changed =
    profileImage !== (session.profileImage ?? null) ||
    canopiUserId !== (session.canopiUserId ?? null);

  return { profileImage, canopiUserId, changed };
}
