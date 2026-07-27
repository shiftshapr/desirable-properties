import { govhubUrl } from '@/lib/govhub';

export function resolveAvatarUrl(
  profileImage: string | null | undefined,
  size = 80,
): string | null {
  const raw = String(profileImage || '').trim();
  if (!raw) return null;

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    if (raw.includes('googleusercontent.com')) {
      return raw.replace(/s\d+-c/, `s${size}-c`);
    }
    return raw;
  }

  if (raw.startsWith('/')) {
    return govhubUrl(raw);
  }

  return raw;
}

export function avatarInitials(displayName: string | null | undefined, username: string) {
  const source = (displayName || username || '?').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}
