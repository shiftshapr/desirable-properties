import type {
  InviteDraftInput,
  InviteDraftResponse,
  InviteResearchInput,
  InviteResearchResponse,
  InviteSendInput,
  InviteSendResponse,
} from '@/lib/workgroup-collab-types';

export type ZohoContactCandidate = {
  id: string;
  name: string;
  email: string;
  confidence: 'high' | 'medium' | 'low';
  score: number;
  summary?: string;
  message_count?: number;
  last_contact?: string;
  sample_subjects?: string[];
  snippets?: string[];
};

export type SearchHitCandidate = {
  id: string;
  url: string;
  title: string;
  snippet: string;
  relevance: 'high' | 'medium' | 'low';
  relevance_score: number;
  rationale?: string;
};

export type UrlAuthorCandidate = {
  id: string;
  name: string;
  role?: string;
  context?: string;
  confidence: 'high' | 'medium' | 'low';
  score: number;
  source_url: string;
  suggested_email?: string;
  email_candidates?: Array<{ email: string; source_url?: string; source_title?: string }>;
};

export type InvitePathwayApplyPayload = {
  name: string;
  email: string;
  previous_interaction: string;
  extra_links: string[];
  linkedin_url?: string;
};

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    const err = typeof data?.error === 'string' ? data.error : `Request failed (${res.status})`;
    throw new Error(err);
  }
  return data;
}

export async function adminInviteResearch(
  input: InviteResearchInput,
): Promise<InviteResearchResponse> {
  const res = await fetch('/api/admin/invite-ai/research', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseJson<InviteResearchResponse>(res);
}

export async function adminInviteDraft(
  input: InviteDraftInput,
): Promise<InviteDraftResponse> {
  const res = await fetch('/api/admin/invite-ai/draft', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseJson<InviteDraftResponse>(res);
}

export async function adminInviteSend(input: InviteSendInput): Promise<InviteSendResponse> {
  const res = await fetch('/api/admin/invite-ai/send', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseJson<InviteSendResponse>(res);
}

export async function adminInvitePathwayZoho(): Promise<{
  configured?: boolean;
  contacts?: ZohoContactCandidate[];
  error?: string;
  message_count?: number;
  source?: 'snapshot' | 'live';
  exported_at?: string;
}> {
  const res = await fetch('/api/admin/invite-ai/pathways/zoho', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  return parseJson(res);
}

export async function adminInvitePathwaySearch(input: {
  name: string;
  context?: string;
}): Promise<{
  results?: SearchHitCandidate[];
  query?: string;
  search_available?: boolean;
  message?: string;
  error?: string;
}> {
  const res = await fetch('/api/admin/invite-ai/pathways/search', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseJson(res);
}

export async function adminInvitePathwayUrl(input: {
  url: string;
}): Promise<{
  authors?: UrlAuthorCandidate[];
  page_title?: string;
  page_summary?: string;
  url?: string;
  error?: string;
}> {
  const res = await fetch('/api/admin/invite-ai/pathways/url', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseJson(res);
}

export async function adminInvitePathwayApply(input: {
  zoho_contact?: ZohoContactCandidate | null;
  search_results?: SearchHitCandidate[];
  url_author?: UrlAuthorCandidate | null;
  page_summary?: string;
}): Promise<InvitePathwayApplyPayload & { success?: boolean }> {
  const res = await fetch('/api/admin/invite-ai/pathways/apply', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseJson(res);
}
