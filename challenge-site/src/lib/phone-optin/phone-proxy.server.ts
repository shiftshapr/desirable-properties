import { NextResponse } from 'next/server';
import { proxyGovHubJson } from '@/lib/govhub-proxy';
import { phoneOptinEnabled } from '@/lib/phone-optin/flag';
import { sameOrigin } from '@/lib/sessions/session-chat-core';

/**
 * /api/me/phone* proxy routes to Gov Hub's phone endpoints (interface-gov-hub routes/phone.py), through the same
 * Gov Hub client as the rest of the site (proxyGovHubJson: the signed-in person's Web3Auth idToken as Bearer).
 * No phone number is stored or logged here.
 */

const NO_STORE = { 'Cache-Control': 'no-store, private' };

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

/** 404 while PHONE_OPTIN is off (no Gov Hub call). */
export function phoneRouteDisabled(): NextResponse | null {
  return phoneOptinEnabled() ? null : json({ error: 'Not found' }, 404);
}

/** Flag, same-origin and JSON checks for a change; returns the parsed body or the error response. */
export async function readPhoneMutation(
  request: Request,
): Promise<{ body: Record<string, unknown>; error: null } | { body: null; error: NextResponse }> {
  const off = phoneRouteDisabled();
  if (off) return { body: null, error: off };
  if (!sameOrigin(request)) return { body: null, error: json({ error: 'Forbidden' }, 403) };
  if (!(request.headers.get('content-type') || '').toLowerCase().includes('application/json')) {
    return { body: null, error: json({ error: 'Send JSON.' }, 415) };
  }
  const body = (await request.json().catch(() => null)) as unknown;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { body: null, error: json({ error: 'Send JSON.' }, 400) };
  }
  return { body: body as Record<string, unknown>, error: null };
}

export function phoneBadRequest(message: string) {
  return json({ error: message }, 400);
}

/** Calls Gov Hub /api/me/phone{suffix} as the signed-in person. */
export function proxyGovHubPhone(suffix: '' | '/start' | '/confirm' | '/channels', method: string, body?: unknown) {
  return proxyGovHubJson(`/api/me/phone${suffix}`, {
    requireAuth: true,
    method,
    // Gov Hub's phone routes accept JSON only (DELETE too), so a change always carries a body.
    body: method === 'GET' ? undefined : (body ?? {}),
    timeoutMs: 30000,
  });
}
