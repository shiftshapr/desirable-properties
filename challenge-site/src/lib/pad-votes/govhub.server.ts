import 'server-only';
import { readSession } from '@/lib/auth-session';
import { govhubInternalApiSecret } from '@/lib/support-hermes-auth';
import { getGovHubProxyBaseUrl } from '@/lib/web3auth-config';

/**
 * Gov Hub as the store of record for pad votes (handoff/specs/pad-votes-govhub-api.md, owner approved 25 Nov 2026).
 *
 * PAD_VOTES_BACKEND=govhub switches the ballot, participation, advisory, supports and screening stores to Gov Hub's
 * /api/pad-votes API; anything else (the default) keeps them in the DP site's Postgres. With Gov Hub the DP site keeps
 * no vote of its own:
 *  - a vote or a signal goes with the visitor's own sign-in (their Bearer idToken), never as the site;
 *  - the site's server reads signal rows and council seats with the admin proxy (internal secret + admin email);
 *  - ballot results arrive as Gov Hub's aggregate counts. No endpoint gives the site anyone's choices but the
 *    visitor's own.
 *
 * When Gov Hub is down (spec §9): reads of public data return the last good copy (never anyone's choices); casting
 * fails closed and the site stores nothing.
 */

export type PadVotesBackend = 'dp' | 'govhub';

export function padVotesBackend(): PadVotesBackend {
  return (process.env.PAD_VOTES_BACKEND || '').trim().toLowerCase() === 'govhub' ? 'govhub' : 'dp';
}

export const PAD_VOTES_SCOPE = 'dp';

export const UNAVAILABLE_MESSAGE =
  "Voting is paused: we can't reach the vote store. Your vote was not recorded; please try again shortly.";

export type GhResult<T> =
  | { ok: true; status: number; data: T; stale?: boolean }
  | { ok: false; status: number; data: Record<string, unknown>; unavailable: boolean };

type As = 'user' | 'admin' | 'public';

const TIMEOUT_MS = 10_000;
const PUBLIC_CACHE_MS = 60_000;
const publicCache = new Map<string, { at: number; data: unknown }>();

function adminEmail(): string {
  const explicit = (process.env.PAD_VOTES_GOVHUB_ADMIN_EMAIL || '').trim().toLowerCase();
  if (explicit) return explicit;
  return (process.env.DP_ADMIN_EMAILS || process.env.ONCHAIN_ADMIN_EMAILS || '').split(',')[0]?.trim().toLowerCase() || '';
}

async function once(url: string, init: RequestInit): Promise<Response> {
  return fetch(url, { ...init, cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS) });
}

/** One call to /api/pad-votes. GETs retry once. A network failure or 5xx is `unavailable`. */
export async function padVotesFetch<T>(
  path: string,
  opts: { as: As; method?: string; body?: unknown; idToken?: string | null } = { as: 'public' },
): Promise<GhResult<T>> {
  const method = (opts.method || 'GET').toUpperCase();
  const url = `${getGovHubProxyBaseUrl()}/api/pad-votes${path.startsWith('/') ? path : `/${path}`}`;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.as === 'admin') {
    const secret = govhubInternalApiSecret();
    const email = adminEmail();
    if (!secret || !email) return { ok: false, status: 500, data: { error: 'Gov Hub admin proxy is not configured', code: 'proxy_not_configured' }, unavailable: true };
    headers.Authorization = `Bearer ${secret}`;
    headers['X-DP-Admin-Email'] = email;
  } else if (opts.as === 'user') {
    const token = opts.idToken ?? (await readSession().catch(() => null))?.idToken;
    if (!token) return { ok: false, status: 401, data: { error: 'Sign in first', code: 'sign_in' }, unavailable: false };
    headers.Authorization = `Bearer ${token}`;
  }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  const init: RequestInit = { method, headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined };
  const attempts = method === 'GET' ? 2 : 1;
  let last: GhResult<T> = { ok: false, status: 503, data: { error: UNAVAILABLE_MESSAGE, code: 'unavailable' }, unavailable: true };
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await once(url, init);
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (res.ok) {
        if (opts.as === 'public' && method === 'GET') publicCache.set(path, { at: Date.now(), data });
        return { ok: true, status: res.status, data: data as T };
      }
      last = { ok: false, status: res.status, data, unavailable: res.status >= 500 };
      if (res.status < 500) return last;
    } catch (err) {
      console.warn('[pad-votes] Gov Hub unreachable:', method, path.split('?')[0], err instanceof Error ? err.name : err);
    }
  }
  if (opts.as === 'public' && method === 'GET') {
    const hit = publicCache.get(path);
    if (hit) return { ok: true, status: 200, data: hit.data as T, stale: true };
  }
  return last;
}

/** Fresh public data within a minute, without calling Gov Hub again. */
export async function padVotesPublic<T>(path: string): Promise<GhResult<T>> {
  const hit = publicCache.get(path);
  if (hit && Date.now() - hit.at < PUBLIC_CACHE_MS) return { ok: true, status: 200, data: hit.data as T };
  return padVotesFetch<T>(path, { as: 'public' });
}

export function forgetPublic(prefix: string): void {
  for (const k of publicCache.keys()) if (k.startsWith(prefix)) publicCache.delete(k);
}

/* ---------------- council seats ---------------- */

export type Seat = { userId: string; name: string };

let seats: { at: number; list: Seat[] } | null = null;
const SEATS_MS = 60_000;

/** The council's current seats from Gov Hub (who may screen and hide proposals). Refreshed at most once a minute. */
export async function primeCouncilSeats(): Promise<Seat[]> {
  if (seats && Date.now() - seats.at < SEATS_MS) return seats.list;
  const r = await padVotesFetch<{ seats: { user_id: string; name: string }[] }>(`/admin/${PAD_VOTES_SCOPE}/council-seats`, { as: 'admin' });
  if (r.ok) {
    seats = { at: Date.now(), list: (r.data.seats || []).map((s) => ({ userId: String(s.user_id), name: String(s.name) })) };
    return seats.list;
  }
  // Gov Hub did not answer: keep the last good list for a while, else nobody can act (deny rather than guess).
  console.warn('[pad-votes] council seats unavailable:', r.status);
  return seats && Date.now() - seats.at < 30 * 60_000 ? seats.list : [];
}

/** Synchronous view for the pure cores. Call primeCouncilSeats() first in the same request. */
export function councilSeats(): readonly Seat[] {
  return seats?.list ?? [];
}

/* ---------------- signal rows ---------------- */

export type SignalRow = {
  id: string;
  pad_ref: string;
  question_key: string;
  user_id: string;
  kind: string;
  reason: string | null;
  show_name: boolean;
  name: string;
  created_at: string;
  updated_at: string;
  superseded_at: string | null;
  end_reason: string | null;
};

/** Every signal row on these pads (admin proxy). Throws when Gov Hub is unavailable, like a database error did. */
export async function signalRows(padKind: 'proposal_pad' | 'session_proposal' | 'screening', refs: string[]): Promise<SignalRow[]> {
  const list = [...new Set(refs.filter(Boolean))];
  if (!list.length) return [];
  const q = encodeURIComponent(list.join(','));
  const r = await padVotesFetch<{ rows: SignalRow[] }>(`/admin/${PAD_VOTES_SCOPE}/signal-rows/${padKind}?refs=${q}`, { as: 'admin' });
  if (!r.ok) throw new Error(`Gov Hub signal rows: ${r.status}`);
  return r.data.rows || [];
}

export async function writeSignal(
  padKind: 'proposal_pad' | 'session_proposal' | 'screening',
  ref: string,
  body: Record<string, unknown>,
  method: 'POST' | 'DELETE' = 'POST',
): Promise<GhResult<Record<string, unknown>>> {
  return padVotesFetch(`/signals/${PAD_VOTES_SCOPE}/${padKind}/${encodeURIComponent(ref)}`, { as: 'user', method, body });
}
