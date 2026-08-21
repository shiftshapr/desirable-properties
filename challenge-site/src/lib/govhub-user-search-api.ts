import type { GovHubSearchUser } from '@/lib/govhub-user-search-types';

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error('Unexpected server response. Please try again.');
  }
}

export async function searchGovHubUsers(query: string): Promise<GovHubSearchUser[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const res = await fetch(`/api/govhub/users/search?q=${encodeURIComponent(q)}`, {
    credentials: 'include',
    cache: 'no-store',
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(String(data.error || 'Could not search Gov Hub members'));
  }

  const rows = Array.isArray(data.users) ? data.users : [];
  const users: GovHubSearchUser[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const u = row as Record<string, unknown>;
    const id = String(u.id || '').trim();
    const email = String(u.email || '').trim();
    if (!id || !email.includes('@')) continue;
    users.push({
      id,
      username: String(u.username || '').trim(),
      handle: u.handle != null ? String(u.handle) : null,
      display_name: String(u.display_name || u.displayName || u.username || email).trim(),
      email,
    });
  }
  return users;
}

export async function fetchConnectedGovHubUsers(): Promise<GovHubSearchUser[]> {
  const res = await fetch('/api/govhub/users/connected', {
    credentials: 'include',
    cache: 'no-store',
  });
  const data = await parseJson(res);
  if (!res.ok) return [];
  const rows = Array.isArray(data.users) ? data.users : [];
  const users: GovHubSearchUser[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const u = row as Record<string, unknown>;
    const id = String(u.id || '').trim();
    const email = String(u.email || '').trim();
    if (!id || !email.includes('@')) continue;
    users.push({
      id,
      username: String(u.username || '').trim(),
      handle: u.handle != null ? String(u.handle) : null,
      display_name: String(u.display_name || u.displayName || u.username || email).trim(),
      email,
    });
  }
  return users;
}
