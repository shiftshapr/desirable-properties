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
