import type { CanopiSearchUser } from '@/lib/canopi-user-search-types';

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error('Unexpected server response. Please try again.');
  }
}

function mapSearchUser(row: Record<string, unknown>): CanopiSearchUser | null {
  const id = String(row.id || '').trim();
  const handle = String(row.handle || '').trim();
  if (!id || !handle) return null;

  const name = row.name != null ? String(row.name).trim() || null : null;
  const displayNameRaw =
    row.displayName != null
      ? String(row.displayName).trim()
      : row.display_name != null
        ? String(row.display_name).trim()
        : '';
  const emailRaw = row.email != null ? String(row.email).trim().toLowerCase() : '';

  return {
    id,
    handle,
    name,
    displayName: displayNameRaw || name || handle,
    email: emailRaw.includes('@') ? emailRaw : null,
  };
}

export async function searchCanopiUsers(query: string): Promise<CanopiSearchUser[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const res = await fetch(`/api/canopi/users/search?q=${encodeURIComponent(q)}`, {
    credentials: 'include',
    cache: 'no-store',
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(String(data.error || 'Could not search Canopi members'));
  }

  const rows = Array.isArray(data.users) ? data.users : [];
  const users: CanopiSearchUser[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const mapped = mapSearchUser(row as Record<string, unknown>);
    if (mapped) users.push(mapped);
  }
  return users;
}
