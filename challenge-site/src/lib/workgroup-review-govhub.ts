import { GOVHUB_PUBLIC_BASE_URL } from '@/lib/govhub';
import type { GovHubDraftProposal } from '@/lib/govhub';
import type { ReviewWorkingRevision } from '@/lib/workgroup-review-types';

export function draftRefFromDocumentHref(href?: string | null): string | null {
  const raw = String(href || '').trim();
  if (!raw) return null;
  const match = raw.match(/\/doc\/draft\/([^/?#]+)/i);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function draftRefFromLabel(label?: string | null): string | null {
  const match = String(label || '').match(/\bML-Draft-\d+\b/i);
  return match ? match[0] : null;
}

export async function workgroupCanEdit(
  workgroupId: string,
  idToken: string | null | undefined,
): Promise<boolean> {
  if (!idToken) return false;
  try {
    const res = await fetch(
      `${GOVHUB_PUBLIC_BASE_URL}/api/workgroups/${encodeURIComponent(workgroupId)}/`,
      {
        headers: { Authorization: `Bearer ${idToken}`, Accept: 'application/json' },
        cache: 'no-store',
      },
    );
    if (!res.ok) return false;
    const data = (await res.json()) as { can_edit?: boolean };
    return Boolean(data.can_edit);
  } catch {
    return false;
  }
}

export async function fetchDraftProposalsFresh(
  draftRef: string,
): Promise<GovHubDraftProposal[]> {
  const ref = String(draftRef || '').trim();
  if (!ref) return [];
  try {
    const res = await fetch(
      `${GOVHUB_PUBLIC_BASE_URL}/api/doc/draft/${encodeURIComponent(ref)}/proposals/`,
      { cache: 'no-store', headers: { Accept: 'application/json' } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { proposals?: GovHubDraftProposal[] };
    return data.proposals || [];
  } catch {
    return [];
  }
}

type GovHubJson = Record<string, unknown>;

async function govHubAuthed(
  path: string,
  idToken: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; data: GovHubJson }> {
  const res = await fetch(`${GOVHUB_PUBLIC_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => ({}))) as GovHubJson;
  return { ok: res.ok, status: res.status, data };
}

export async function fetchWorkingRevision(
  draftRef: string,
  idToken: string,
): Promise<ReviewWorkingRevision> {
  const empty: ReviewWorkingRevision = {
    exists: false,
    revisionNumber: null,
    appliedCount: 0,
    unpublished: false,
    canPublish: false,
    publishBlockReason: 'No revision draft yet. Promote at least one proposal first. That does not publish.',
  };
  try {
    const result = await govHubAuthed(
      `/api/doc/draft/${encodeURIComponent(draftRef)}/working-revision/`,
      idToken,
    );
    if (result.status === 404) {
      return {
        ...empty,
        publishBlockReason:
          'Gov Hub has no working-revision publish API on this host yet.',
      };
    }
    if (!result.ok) {
      return {
        ...empty,
        publishBlockReason:
          String(result.data.error || `Working revision ${result.status}`),
      };
    }
    const working = (result.data.working_revision || null) as {
      revision_number?: string;
      applied_proposal_count?: number;
      unpublished?: boolean;
    } | null;
    const applied = Number(working?.applied_proposal_count || 0);
    const exists = Boolean(result.data.exists && working);
    return {
      exists,
      revisionNumber: working?.revision_number || null,
      appliedCount: applied,
      unpublished: Boolean(working?.unpublished),
      canPublish: exists && applied > 0,
      publishBlockReason:
        exists && applied > 0
          ? null
          : 'Publish is a later step. Promote at least one proposal into the revision draft first.',
    };
  } catch (error) {
    return {
      ...empty,
      publishBlockReason: error instanceof Error ? error.message : 'Working revision unavailable',
    };
  }
}

export async function acceptGovHubProposal(
  draftRef: string,
  proposalId: string,
  idToken: string,
): Promise<{ ok: boolean; status: number; error?: string; data: GovHubJson }> {
  const result = await govHubAuthed(
    `/api/doc/draft/${encodeURIComponent(draftRef)}/proposals/${encodeURIComponent(proposalId)}/accept/`,
    idToken,
    { method: 'POST', body: '{}' },
  );
  return {
    ok: result.ok,
    status: result.status,
    error: result.ok ? undefined : String(result.data.error || `Accept failed (${result.status})`),
    data: result.data,
  };
}

export async function declineGovHubProposal(
  draftRef: string,
  proposalId: string,
  idToken: string,
): Promise<{ ok: boolean; status: number; error?: string; data: GovHubJson }> {
  const result = await govHubAuthed(
    `/api/doc/draft/${encodeURIComponent(draftRef)}/proposals/${encodeURIComponent(proposalId)}/decline/`,
    idToken,
    { method: 'POST', body: '{}' },
  );
  return {
    ok: result.ok,
    status: result.status,
    error: result.ok ? undefined : String(result.data.error || `Decline failed (${result.status})`),
    data: result.data,
  };
}

export async function publishWorkingRevision(
  draftRef: string,
  idToken: string,
  whatChanged?: string,
): Promise<{ ok: boolean; status: number; error?: string; data: GovHubJson }> {
  const result = await govHubAuthed(
    `/api/doc/draft/${encodeURIComponent(draftRef)}/working-revision/publish/`,
    idToken,
    {
      method: 'POST',
      body: JSON.stringify(whatChanged ? { what_changed: whatChanged } : {}),
    },
  );
  return {
    ok: result.ok,
    status: result.status,
    error: result.ok ? undefined : String(result.data.error || `Publish failed (${result.status})`),
    data: result.data,
  };
}
