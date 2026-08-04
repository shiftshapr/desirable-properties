/**
 * Verify Resend (Svix) webhook signatures without the SDK.
 */
import crypto from 'crypto';

const TOLERANCE_SEC = Number(process.env.RESEND_WEBHOOK_TOLERANCE_SEC || 300);

function decodeSecret(secret: string) {
  const raw = String(secret || '').trim();
  if (!raw.startsWith('whsec_')) return null;
  try {
    return Buffer.from(raw.slice('whsec_'.length), 'base64');
  } catch {
    return null;
  }
}

function headerValue(headers: Headers, name: string) {
  return String(headers.get(name) || '').trim();
}

export function verifySvixWebhook(
  payload: string,
  headers: Headers,
  secret: string,
): { ok: true; event: Record<string, unknown> } | { ok: false; error: string } {
  const key = decodeSecret(secret);
  if (!key) return { ok: false, error: 'invalid_secret_format' };

  const svixId = headerValue(headers, 'svix-id');
  const svixTimestamp = headerValue(headers, 'svix-timestamp');
  const svixSignature = headerValue(headers, 'svix-signature');
  if (!svixId || !svixTimestamp || !svixSignature) {
    return { ok: false, error: 'missing_svix_headers' };
  }

  const ts = Number(svixTimestamp);
  if (!Number.isFinite(ts)) return { ok: false, error: 'invalid_timestamp' };
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - ts) > TOLERANCE_SEC) {
    return { ok: false, error: 'timestamp_outside_tolerance' };
  }

  const signedContent = `${svixId}.${svixTimestamp}.${payload}`;
  const expected = crypto.createHmac('sha256', key).update(signedContent).digest('base64');

  const parts = svixSignature.split(/\s+/);
  let valid = false;
  for (const part of parts) {
    const comma = part.indexOf(',');
    if (comma < 0) continue;
    const version = part.slice(0, comma);
    const sig = part.slice(comma + 1);
    if (version !== 'v1' || !sig) continue;
    try {
      const sigBuf = Buffer.from(sig);
      const expectedBuf = Buffer.from(expected);
      if (sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf)) {
        valid = true;
        break;
      }
    } catch {
      /* length mismatch */
    }
  }
  if (!valid) return { ok: false, error: 'signature_mismatch' };

  try {
    return { ok: true, event: JSON.parse(payload) as Record<string, unknown> };
  } catch {
    return { ok: false, error: 'invalid_json' };
  }
}
