/** Canopi API base (embed + auth). */
export function getCanopiApiBase() {
  return String(process.env.CANOPI_API_BASE || 'https://api.canopi.live').replace(/\/$/, '');
}

export type CanopiAuthUser = {
  id: string;
  handle?: string | null;
  name?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
};

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
