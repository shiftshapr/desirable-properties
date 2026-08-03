const CANOPI_USER_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function resolveCanopiApiBase() {
  const explicit = (process.env.CANOPI_API_BASE || process.env.CANOPI_API || '').trim();
  if (explicit) return explicit.replace(/\/$/, '');
  return 'https://api.canopi.live';
}

export function isCanopiUserId(userId: string | null | undefined) {
  return CANOPI_USER_ID_RE.test(String(userId || '').trim());
}

/**
 * Resolve a Canopi user's email server-to-server (METAWEB_OPS_SECRET).
 * Same pattern as metaweb-book – requires Canopi `/v1/internal/metaweb/user-email`.
 */
export async function fetchCanopiUserEmail(userId: string): Promise<string | null> {
  const id = String(userId || '').trim();
  if (!CANOPI_USER_ID_RE.test(id)) return null;

  const opsSecret = process.env.METAWEB_OPS_SECRET?.trim();
  if (!opsSecret) return null;

  try {
    const base = resolveCanopiApiBase();
    const res = await fetch(`${base}/v1/internal/metaweb/user-email`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opsSecret}`,
      },
      body: JSON.stringify({ userId: id }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    const email = String(data?.email || '')
      .trim()
      .toLowerCase();
    return email.includes('@') ? email : null;
  } catch {
    return null;
  }
}

/** Batch email lookup with bounded concurrency. */
export async function fetchCanopiUserEmails(
  userIds: string[],
  concurrency = 6,
): Promise<Map<string, string>> {
  const ids = [...new Set(userIds.map((id) => String(id || '').trim()).filter(isCanopiUserId))];
  const out = new Map<string, string>();
  if (!ids.length) return out;

  let index = 0;
  async function worker() {
    while (index < ids.length) {
      const id = ids[index];
      index += 1;
      const email = await fetchCanopiUserEmail(id);
      if (email) out.set(id, email);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }, () => worker()));
  return out;
}
