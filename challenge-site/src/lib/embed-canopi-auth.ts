import { getCanopiApiBase } from '@/lib/canopi-api';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function opsSecret() {
  return process.env.METAWEB_OPS_SECRET?.trim() || '';
}

export type CanopiEmbedAuthResult =
  | {
      ok: true;
      userId: string;
      email: string | null;
      verifierId: string;
      displayName: string | null;
    }
  | { ok: false; error: string; status?: number };

/**
 * Verify Canopi embed token + X-User-Id for Hermes community embed API routes.
 * Maps verified Canopi user to Hermes verifierId (email preferred, else user id).
 */
export async function verifyCanopiEmbedRequest(request: Request): Promise<CanopiEmbedAuthResult> {
  const authHeader = String(request.headers.get('authorization') || '').trim();
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const userId = String(request.headers.get('x-user-id') || request.headers.get('X-User-Id') || '').trim();

  if (!token || !UUID_RE.test(userId)) {
    return { ok: false, error: 'missing_embed_auth', status: 401 };
  }

  const secret = opsSecret();
  if (!secret) {
    return { ok: false, error: 'embed_auth_not_configured', status: 503 };
  }

  try {
    const res = await fetch(`${getCanopiApiBase()}/v1/internal/metaweb/verify-embed-token`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ token, embedToken: token }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.userId) {
      return { ok: false, error: data?.error || 'invalid_embed_token', status: 401 };
    }
    if (String(data.userId) !== userId) {
      return { ok: false, error: 'user_mismatch', status: 401 };
    }
    const email = data.email ? String(data.email).trim().toLowerCase() : null;
    const displayNameHeader = String(request.headers.get('x-canopi-display-name') || '').trim();
    const verifierId = email && email.includes('@') ? email : userId;
    return {
      ok: true,
      userId,
      email: email && email.includes('@') ? email : null,
      verifierId,
      displayName: displayNameHeader || email || null,
    };
  } catch {
    return { ok: false, error: 'verify_failed', status: 502 };
  }
}

export function canopiEmbedAuthHeaders(auth: {
  embedToken: string;
  userId: string;
  displayName?: string | null;
}): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${auth.embedToken}`,
    'X-User-Id': auth.userId,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (auth.displayName) headers['X-Canopi-Display-Name'] = auth.displayName;
  return headers;
}
