import { getCanopiApiBase } from '@/lib/canopi-api';
import { govhubUrl } from '@/lib/govhub';

function isSyntheticAvatarHost(host: string, pathname: string, search: string): boolean {
  const normalizedHost = host.toLowerCase();
  if (/^ui-avatars\.com$/i.test(normalizedHost)) return true;
  if (
    /(^|\.)googleusercontent\.com$/i.test(normalizedHost) &&
    /default-user/i.test(pathname + search)
  ) {
    return true;
  }
  return false;
}

/** Placeholder or generated avatars that should not render as profile photos. */
export function isSyntheticAvatarUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return true;
  try {
    const absolute = trimmed.startsWith('//') ? `https:${trimmed}` : trimmed;
    const parsed = new URL(absolute);
    if (isSyntheticAvatarHost(parsed.hostname, parsed.pathname, parsed.search)) {
      return true;
    }
    // Legacy sessions may store Canopi proxy URLs wrapping ui-avatars placeholders.
    if (/\/avatar-proxy/i.test(parsed.pathname)) {
      const proxied = parsed.searchParams.get('url');
      if (proxied) {
        try {
          const inner = new URL(decodeURIComponent(proxied));
          if (isSyntheticAvatarHost(inner.hostname, inner.pathname, inner.search)) {
            return true;
          }
        } catch {
          if (/ui-avatars\.com|default-user/i.test(proxied)) return true;
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

function needsAvatarProxy(url: string): boolean {
  if (isSyntheticAvatarUrl(url)) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    if (/^(api\.)?canopi\.live$/i.test(parsed.hostname)) return false;
    return (
      /(^|\.)googleusercontent\.com$/i.test(parsed.hostname) ||
      /(^|\.)ggpht\.com$/i.test(parsed.hostname) ||
      /(^|\.)gravatar\.com$/i.test(parsed.hostname) ||
      /(^|\.)auth0\.com$/i.test(parsed.hostname)
    );
  } catch {
    return false;
  }
}

export function resolveAvatarUrl(
  profileImage: string | null | undefined,
  size = 80,
): string | null {
  const raw = String(profileImage || '').trim();
  if (!raw || isSyntheticAvatarUrl(raw)) return null;

  let absolute = raw;
  if (raw.startsWith('//')) {
    absolute = `https:${raw}`;
  } else if (raw.startsWith('/')) {
    // Legacy Gov Hub upload paths – keep working for older sessions.
    absolute = govhubUrl(raw);
  }

  if (absolute.startsWith('http://') || absolute.startsWith('https://')) {
    if (absolute.includes('googleusercontent.com')) {
      absolute = absolute.replace(/s\d+-c/, `s${size}-c`);
    }
    if (needsAvatarProxy(absolute)) {
      const apiBase = getCanopiApiBase();
      let proxied = `${apiBase}/v1/avatar-proxy?url=${encodeURIComponent(absolute)}`;
      try {
        const host = new URL(absolute).hostname;
        if (
          /(^|\.)googleusercontent\.com$/i.test(host) ||
          /(^|\.)ggpht\.com$/i.test(host)
        ) {
          proxied += `&sz=${size}`;
        }
      } catch {
        /* ignore */
      }
      return proxied;
    }
    return absolute;
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
