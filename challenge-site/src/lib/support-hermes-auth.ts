export function hermesApiSecret() {
  return (
    process.env.DP_HERMES_API_KEY?.trim()
    || process.env.DP_SUPPORT_OPS_SECRET?.trim()
    || process.env.METAWEB_OPS_SECRET?.trim()
    || process.env.METAWEB_GOVHUB_INTERNAL_SECRET?.trim()
    || process.env.DP_AUTH_HANDOFF_SECRET?.trim()
    || ''
  );
}

/** Secret for Gov Hub internal routes (e.g. broadcast-user-emails). */
export function govhubInternalApiSecret() {
  return (
    process.env.METAWEB_GOVHUB_INTERNAL_SECRET?.trim()
    || process.env.DP_AUTH_HANDOFF_SECRET?.trim()
    || process.env.METAWEB_OPS_SECRET?.trim()
    || process.env.GOVHUB_HERMES_API_KEY?.trim()
    || process.env.DP_HERMES_API_KEY?.trim()
    || process.env.DP_SUPPORT_OPS_SECRET?.trim()
    || ''
  );
}

/**
 * Keys to try on Gov Hub's Hermes-protected routes (/api/internal/dp/*), most likely first.
 * Gov Hub accepts only the first of GOVHUB_HERMES_API_KEY, GOVHUB_SUPPORT_OPS_SECRET,
 * METAWEB_OPS_SECRET, METAWEB_GOVHUB_INTERNAL_SECRET it has set, and this site may hold several
 * different values, so callers try each until one is accepted (fetchGovHubHermes).
 */
export function govhubHermesSecrets(): string[] {
  const keys = [
    process.env.GOVHUB_HERMES_API_KEY,
    process.env.METAWEB_OPS_SECRET,
    process.env.DP_SUPPORT_OPS_SECRET,
    process.env.METAWEB_GOVHUB_INTERNAL_SECRET,
    process.env.DP_HERMES_API_KEY,
    process.env.DP_AUTH_HANDOFF_SECRET,
  ].map((v) => v?.trim() || '').filter(Boolean);
  return [...new Set(keys)];
}

let acceptedHermesSecret: string | null = null;

/** POST to a Gov Hub Hermes route, trying each key until one is not refused (remembers the one that worked). */
export async function fetchGovHubHermes(url: string, body: unknown, timeoutMs: number): Promise<Response | null> {
  const secrets = govhubHermesSecrets();
  const ordered = acceptedHermesSecret && secrets.includes(acceptedHermesSecret)
    ? [acceptedHermesSecret, ...secrets.filter((s) => s !== acceptedHermesSecret)]
    : secrets;
  let last: Response | null = null;
  for (const secret of ordered) {
    last = await fetch(url, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (last.status !== 401 && last.status !== 403) {
      if (last.ok) acceptedHermesSecret = secret;
      return last;
    }
  }
  return last;
}

export function hermesAuthorized(request: Request) {
  const secret = hermesApiSecret();
  if (!secret) return false;
  const auth = request.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const alt =
    request.headers.get('x-dp-hermes-key')?.trim()
    || request.headers.get('x-metaweb-hermes-key')?.trim()
    || '';
  return bearer === secret || alt === secret;
}
