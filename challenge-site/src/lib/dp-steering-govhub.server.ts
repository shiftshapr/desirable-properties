/**
 * Gov Hub steering-sweep API, called from the DP site's server with the viewer's Bearer token
 * (docs/DP-V1-STEERING-SWEEP-SPEC.md, "API"). Gov Hub checks that the viewer is on the steering
 * committee (the overview: signed in; closed stages: anyone); these calls pass its status and JSON through.
 */
import 'server-only';
import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { GOVHUB_PUBLIC_BASE_URL } from '@/lib/govhub';
import { normalizeMl } from '@/lib/dp-steering';

export type GovHubResult = { ok: boolean; status: number; data: Record<string, unknown> };

export async function steeringFetch(path: string, idToken: string | null, init?: RequestInit): Promise<GovHubResult> {
  try {
    const res = await fetch(`${GOVHUB_PUBLIC_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        ...(init?.headers || {}),
      },
      cache: 'no-store',
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, status: res.status, data };
  } catch (error) {
    return { ok: false, status: 502, data: { error: error instanceof Error ? error.message : 'Gov Hub unreachable' } };
  }
}

export const steeringPaths = {
  overview: () => '/api/doc/steering/overview/',
  document: (ml: string) => `/api/doc/draft/${encodeURIComponent(ml)}/steering/`,
  votes: (ml: string) => `/api/doc/draft/${encodeURIComponent(ml)}/steering/votes/`,
  vote: (ml: string, proposalId: string) =>
    `/api/doc/draft/${encodeURIComponent(ml)}/steering/votes/${encodeURIComponent(proposalId)}/`,
  approveBatch: (batchId: string) => `/api/doc/steering/batches/${encodeURIComponent(batchId)}/approve/`,
  audit: () => '/api/doc/steering/audit/',
  stages: () => '/api/doc/steering/stages/',
  stage: (key: string) => `/api/doc/steering/stages/${encodeURIComponent(key)}/`,
  stageDocument: (key: string, ml: string) =>
    `/api/doc/steering/stages/${encodeURIComponent(key)}/documents/${encodeURIComponent(ml)}/`,
  closeStage: () => '/api/doc/steering/stages/close/',
  openNextStage: () => '/api/doc/steering/stages/open-next/',
  issues: () => '/api/doc/steering/issues/',
  reviewCarried: (proposalId: string) =>
    `/api/doc/steering/stages/current/carried/${encodeURIComponent(proposalId)}/review/`,
  keepAll: (ml: string) => `/api/doc/steering/stages/current/documents/${encodeURIComponent(ml)}/keep-all/`,
  signoff: (ml: string) => `/api/doc/steering/stages/current/documents/${encodeURIComponent(ml)}/signoff/`,
};

/** A stage key as Gov Hub writes it (stage-1, stage-2, stage-3, final), or null. */
export function stageKey(raw: string | null | undefined): string | null {
  const k = String(raw || '').trim().toLowerCase();
  return /^(stage-\d{1,2}|final)$/.test(k) ? k : null;
}

/** The signed-in viewer's token, or a 401 response to return. */
export async function requireSteeringSession(): Promise<
  { idToken: string; userId: string; name: string } | { response: NextResponse }
> {
  const session = await readSession();
  if (!session?.userId || !session.idToken) {
    return { response: NextResponse.json({ error: 'Sign in required', code: 'sign_in' }, { status: 401 }) };
  }
  return {
    idToken: session.idToken,
    userId: session.userId,
    name: session.displayName || session.username || 'Steering member',
  };
}

export function mlOr400(raw: string): { ml: string } | { response: NextResponse } {
  const ml = normalizeMl(raw);
  if (!ml) return { response: NextResponse.json({ error: 'Not an ML-Draft reference' }, { status: 400 }) };
  return { ml };
}

/** Gov Hub's reply as this route's reply, with a readable error for the common refusals. */
export function passThrough(result: GovHubResult): NextResponse {
  if (result.ok) return NextResponse.json(result.data, { headers: { 'Cache-Control': 'no-store' } });
  const fallback =
    result.status === 401
      ? 'Gov Hub did not accept your sign-in. Sign in again.'
      : result.status === 403
        ? 'Only steering committee members can use the steering sweep.'
        : result.status === 404
          ? 'Gov Hub has no steering sweep API on this host yet.'
          : `Gov Hub error (${result.status})`;
  return NextResponse.json(
    {
      ...result.data,
      error: String(result.data.error || result.data.detail || fallback),
      ...(result.status === 401 ? { code: 'sign_in_again' } : {}),
    },
    { status: result.status || 502, headers: { 'Cache-Control': 'no-store' } },
  );
}

export type SteeringVoteInput = {
  proposal_id: string;
  decision: 'accept' | 'accept_revised' | 'decline' | 'defer';
  revised_text?: string;
  agrees_with_analysis?: boolean | null;
  note?: string;
};

export function postSteeringVote(ml: string, idToken: string, input: SteeringVoteInput) {
  return steeringFetch(steeringPaths.votes(ml), idToken, { method: 'POST', body: JSON.stringify(input) });
}

export function fetchSteeringDocument(ml: string, idToken: string) {
  return steeringFetch(steeringPaths.document(ml), idToken);
}
