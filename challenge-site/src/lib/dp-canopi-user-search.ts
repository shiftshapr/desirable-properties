import { getCanopiApiBase } from '@/lib/canopi-api';

export type CanopiSearchUserRow = {
  id: string;
  handle: string;
  name: string | null;
  displayName: string | null;
  email: string | null;
};

function opsSecret() {
  return process.env.METAWEB_OPS_SECRET?.trim() || '';
}

function metawebOpsHeaders(): Record<string, string> | null {
  const secret = opsSecret();
  if (!secret) return null;
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${secret}`,
  };
}

function mapSearchUserRow(raw: Record<string, unknown>): CanopiSearchUserRow | null {
  const id = String(raw.id || '').trim();
  const handle = String(raw.handle || '').trim();
  if (!id || !handle) return null;
  return {
    id,
    handle,
    name: raw.name != null ? String(raw.name).trim() || null : null,
    displayName:
      raw.displayName != null
        ? String(raw.displayName).trim() || null
        : raw.display_name != null
          ? String(raw.display_name).trim() || null
          : null,
    email: raw.email != null ? String(raw.email).trim().toLowerCase() || null : null,
  };
}

/** Server-side search of Canopi AppUser master list (METAWEB_OPS_SECRET). */
export async function searchCanopiUsersServer(
  query: string,
  limit = 20,
): Promise<CanopiSearchUserRow[]> {
  const q = String(query || '').trim();
  if (q.length < 2) return [];

  const headers = metawebOpsHeaders();
  if (!headers) return [];

  try {
    const res = await fetch(`${getCanopiApiBase()}/v1/internal/metaweb/search-users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ q, limit }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) return [];
    const rows = Array.isArray(data.users) ? data.users : [];
    const users: CanopiSearchUserRow[] = [];
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      const mapped = mapSearchUserRow(row as Record<string, unknown>);
      if (mapped) users.push(mapped);
    }
    return users;
  } catch {
    return [];
  }
}

export type ResolvedCanopiAppUser = {
  userId: string;
  email: string | null;
  verifierId: string;
};

/** Resolve AppUser by email or UUID for Hermes direct delivery. */
export async function resolveCanopiUserServer(params: {
  email?: string | null;
  userId?: string | null;
}): Promise<ResolvedCanopiAppUser | null> {
  const headers = metawebOpsHeaders();
  if (!headers) return null;

  const email = String(params.email || '').trim().toLowerCase();
  const userId = String(params.userId || '').trim();
  if (!email.includes('@') && !/^[0-9a-f-]{36}$/i.test(userId)) return null;

  try {
    const body: Record<string, string> = {};
    if (userId) body.userId = userId;
    if (email.includes('@')) body.email = email;

    const res = await fetch(`${getCanopiApiBase()}/v1/internal/metaweb/resolve-user`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok || !data?.userId) return null;

    const resolvedEmail = data.email ? String(data.email).trim().toLowerCase() : null;
    const verifierId = String(data.verifierId || '').trim();
    if (!verifierId) return null;

    return {
      userId: String(data.userId),
      email: resolvedEmail && resolvedEmail.includes('@') ? resolvedEmail : null,
      verifierId,
    };
  } catch {
    return null;
  }
}
