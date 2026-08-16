export function verifyEmbedHermesProxy(request: Request): boolean {
  const expected = process.env.CANOPI_EMBED_AI_PROXY_SECRET?.trim();
  if (!expected) return false;
  const provided =
    request.headers.get('x-canopi-embed-ai-proxy-secret')?.trim() ||
    request.headers.get('X-Canopi-Embed-AI-Proxy-Secret')?.trim();
  return provided === expected;
}

export type EmbedCanopiUser = {
  id?: string | null;
  email?: string | null;
};

export function embedCanopiUserFromBody(body: Record<string, unknown>): EmbedCanopiUser {
  const raw = body.canopiUser as EmbedCanopiUser | undefined;
  return {
    id: raw?.id ? String(raw.id) : null,
    email: raw?.email ? String(raw.email).trim().toLowerCase() : null,
  };
}
