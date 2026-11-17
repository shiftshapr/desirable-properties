import { NextResponse } from 'next/server';
import {
  ACK_IMAGE_MAX,
  ACK_IMAGE_MAX_BYTES,
  ACK_IMAGE_MESSAGES,
  clientIpFromHeaders,
  sniffAckImage,
} from '@/lib/ack-request';
import { readSession } from '@/lib/auth-session';
import { govhubHermesSecrets } from '@/lib/support-hermes-auth';
import { getGovHubProxyBaseUrl } from '@/lib/web3auth-config';

const NO_STORE = { 'Cache-Control': 'no-store' };
const UPSTREAM_DOWN = 'We could not send your request just now. Please try again in a few minutes.';
/** Three images of up to 5 MB and the form fields. next.config.ts lets the proxy buffer this much. */
const MAX_REQUEST_BYTES = ACK_IMAGE_MAX * ACK_IMAGE_MAX_BYTES + 512 * 1024;

type Json = Record<string, unknown>;

function reply(data: Json, status: number) {
  return NextResponse.json(data, { status, headers: NO_STORE });
}

function invalid(field: string, message: string, status = 400) {
  return reply({ ok: false, error: 'invalid', errors: { [field]: message }, message }, status);
}

/**
 * Acknowledgements adjustment request: sent on to Gov Hub, which stores it (privately) and
 * returns a reference code. Signing in is optional. The browser's address goes along in
 * X-DP-Client-IP with the Gov Hub server key, so Gov Hub can rate-limit the sender rather than
 * this server. Nothing is stored or logged here, and no email is sent.
 *
 * With images (multipart/form-data: "payload" JSON and up to three "images"), each image is first
 * uploaded to Gov Hub, which checks it, strips its metadata and keeps it for reviewers only; the
 * request then names the uploads. A rejected image stops the request before anything is sent.
 */
export async function POST(request: Request) {
  const multipart = (request.headers.get('content-type') || '').toLowerCase().startsWith('multipart/form-data');
  let body: unknown;
  let images: File[] = [];
  if (multipart) {
    if (Number(request.headers.get('content-length') || 0) > MAX_REQUEST_BYTES) {
      return invalid('images', ACK_IMAGE_MESSAGES.size, 413);
    }
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return reply({ ok: false, error: 'invalid_form', message: 'We could not read the form. Please try again.' }, 400);
    }
    try {
      body = JSON.parse(String(form.get('payload') ?? ''));
    } catch {
      return reply({ ok: false, error: 'invalid_json' }, 400);
    }
    images = form.getAll('images').filter((f): f is File => f instanceof File && f.size > 0);
  } else {
    try {
      body = await request.json();
    } catch {
      return reply({ ok: false, error: 'invalid_json' }, 400);
    }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return reply({ ok: false, error: 'invalid_json' }, 400);
  }
  const payload: Json = { ...(body as Json) };
  delete payload.attachments; // only uploads made here are attached

  if (images.length > ACK_IMAGE_MAX) return invalid('images', ACK_IMAGE_MESSAGES.count);
  const encoded: string[] = [];
  for (const file of images) {
    if (file.size > ACK_IMAGE_MAX_BYTES) return invalid('images', `${file.name}: ${ACK_IMAGE_MESSAGES.size}`, 413);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = sniffAckImage(bytes.subarray(0, 16));
    if (kind === 'heic') return invalid('images', `${file.name}: ${ACK_IMAGE_MESSAGES.heic}`, 415);
    if (!kind) return invalid('images', `${file.name}: ${ACK_IMAGE_MESSAGES.type}`, 415);
    encoded.push(Buffer.from(bytes).toString('base64'));
  }

  const session = await readSession().catch(() => null);
  const ip = clientIpFromHeaders(request.headers);
  const base = `${getGovHubProxyBaseUrl()}/api/dp/acknowledgements/requests/`;
  // Gov Hub trusts X-DP-Client-IP only alongside one of its server keys; without it, it rate-limits
  // by this server's address instead.
  const key = govhubHermesSecrets()[0] || '';
  const headers: Record<string, string> = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (session?.idToken) headers.Authorization = `Bearer ${session.idToken}`;
  if (key && ip) {
    headers['X-DP-Hermes-Key'] = key;
    headers['X-DP-Client-IP'] = ip;
  }

  const post = async (url: string, data: Json, timeoutMs: number) => {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
      redirect: 'manual',
    });
    const out = await res.json().catch(() => null);
    return { res, data: out && typeof out === 'object' ? (out as Json) : null };
  };

  try {
    // A filled honeypot goes straight on (Gov Hub drops it quietly); its images are never uploaded.
    const honeypot = typeof payload.website === 'string' && payload.website.trim() !== '';
    if (encoded.length && !honeypot) {
      const attachments: { id: string; token: string }[] = [];
      for (let i = 0; i < encoded.length; i++) {
        const { res, data } = await post(`${base}attachments/`, { image: encoded[i] }, 30000);
        if (!data) return reply({ ok: false, error: 'upstream', message: UPSTREAM_DOWN }, 502);
        if (!res.ok || !data.ok || typeof data.id !== 'string' || typeof data.token !== 'string') {
          const message = typeof data.message === 'string' ? data.message : ACK_IMAGE_MESSAGES.type;
          const label = images.length > 1 ? `${images[i].name}: ` : '';
          return reply({ ok: false, error: data.error || 'image', errors: { images: `${label}${message}` },
            message: `${label}${message}` }, res.status >= 400 ? res.status : 400);
        }
        attachments.push({ id: data.id, token: data.token });
      }
      payload.attachments = attachments;
    }
    const { res, data } = await post(base, payload, 20000);
    if (!data) return reply({ ok: false, error: 'upstream', message: UPSTREAM_DOWN }, 502);
    return reply(data, res.status);
  } catch {
    return reply({ ok: false, error: 'upstream', message: UPSTREAM_DOWN }, 504);
  }
}
