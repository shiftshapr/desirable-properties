/**
 * Server side of the DP Council pages: reads Gov Hub's council election API for the /council pages
 * and wraps proxyGovHubJson for the /api/council routes (Gov Hub status and error code passed
 * through, plus a plain-language `message`).
 */
import 'server-only';
import { NextResponse } from 'next/server';
import { proxyGovHubJson } from '@/lib/govhub-proxy';
import { getGovHubProxyBaseUrl } from '@/lib/web3auth-config';
import {
  councilApiPaths,
  friendlyCouncilError,
  type CouncilDetail,
  type ElectionDetail,
} from '@/lib/council';

type Fetched<T> = { ok: true; data: T } | { ok: false; status: number };

async function govhubGet<T>(path: string, idToken?: string | null): Promise<Fetched<T>> {
  const url = `${getGovHubProxyBaseUrl()}${path}`;
  const attempt = async (token?: string | null) => {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(20000),
    });
    return res;
  };
  try {
    let res = await attempt(idToken);
    // A stale sign-in must not hide public pages: retry signed out.
    if (idToken && (res.status === 401 || (res.status >= 300 && res.status < 400))) res = await attempt(null);
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, status: 502 };
  }
}

export function fetchCouncil(idToken?: string | null) {
  return govhubGet<CouncilDetail>(councilApiPaths().council(), idToken);
}

/** The election as this viewer sees it (candidate order is the viewer's ballot order). */
export function fetchElection(electionId: string, idToken?: string | null) {
  return govhubGet<ElectionDetail>(councilApiPaths(electionId).election(), idToken);
}

type CouncilProxyOptions = {
  requireAuth?: boolean;
  method?: string;
  body?: unknown;
};

/** Proxy one council API call; errors keep Gov Hub's status and code and gain a friendly message. */
export async function councilProxy(path: string, options: CouncilProxyOptions = {}): Promise<NextResponse> {
  const upstream = await proxyGovHubJson(path, {
    requireAuth: options.requireAuth !== false,
    method: options.method,
    body: options.body,
    timeoutMs: 30000,
  });
  if (upstream.ok) return upstream;
  const data = (await upstream.json().catch(() => ({}))) as Record<string, unknown>;
  const status = upstream.status;
  const upstreamCode = typeof data.code === 'string' ? data.code : undefined;
  // No DP-site session at all (the proxy's own reply) vs a session Gov Hub no longer accepts.
  const code =
    status === 401 ? (upstreamCode === 'AUTHENTICATION_REQUIRED' ? 'authentication_required' : 'sign_in_again') : upstreamCode;
  return NextResponse.json(
    {
      ...data,
      ...(code ? { code } : {}),
      ...(status === 401 && upstreamCode ? { upstream_code: upstreamCode } : {}),
      message: friendlyCouncilError(code, data.error),
    },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => ({}));
  return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message, message, code: 'bad_request' }, { status: 400 });
}
