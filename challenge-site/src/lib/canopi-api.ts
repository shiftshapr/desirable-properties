/** Server-to-server Canopi API base (PM2 may use loopback). */
export function getCanopiApiBase() {
  return String(process.env.CANOPI_API_BASE || 'https://api.canopi.live').replace(/\/$/, '');
}

/** Browser-facing Canopi API base for avatar-proxy and other public URLs. */
export function getCanopiPublicApiBase() {
  const explicit = (
    process.env.CANOPI_PUBLIC_API_BASE
    || process.env.NEXT_PUBLIC_CANOPI_API_BASE
    || ''
  ).trim();
  if (explicit) return explicit.replace(/\/$/, '');
  return 'https://api.canopi.live';
}

/** Canopi web app (main product UI). */
export function getCanopiAppBase(): string {
  return String(
    process.env.NEXT_PUBLIC_CANOPI_APP_BASE
    || process.env.CANOPI_APP_BASE
    || 'https://app.canopi.live',
  ).replace(/\/$/, '');
}

export type CanopiAuthUser = {
  id: string;
  handle?: string | null;
  name?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
};

/** Public Canopi profile by AppUser UUID. */
export async function fetchCanopiUserProfile(userId: string): Promise<CanopiAuthUser | null> {
  const id = String(userId || '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return null;
  }

  try {
    const res = await fetch(`${getCanopiApiBase()}/v1/users/${encodeURIComponent(id)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.id) return null;
    return data as CanopiAuthUser;
  } catch {
    return null;
  }
}

/** Exchange Web3Auth idToken for Canopi AppUser (avatar, handle). Best-effort. */
export async function fetchCanopiWeb3AuthUser(
  idToken: string,
): Promise<CanopiAuthUser | null> {
  const token = String(idToken || '').trim();
  if (!token) return null;

  try {
    const res = await fetch(`${getCanopiApiBase()}/api/auth/web3auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ idToken: token }),
      signal: AbortSignal.timeout(20000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.user?.id) return null;
    return data.user as CanopiAuthUser;
  } catch {
    return null;
  }
}
