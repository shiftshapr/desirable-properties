import type {
  InviteDraftInput,
  InviteDraftResponse,
  InviteResearchInput,
  InviteResearchResponse,
  InviteSendInput,
  InviteSendResponse,
  ZohoCommunicationStyle,
  ZohoContactContext,
} from '@/lib/workgroup-collab-types';

export type { ZohoCommunicationStyle, ZohoContactContext };

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
  communication_style?: ZohoCommunicationStyle;
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
  zoho_contact_context?: ZohoContactContext | null;
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

export async function adminInviteSend(
  input: InviteSendInput & { source?: string },
): Promise<InviteSendResponse> {
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

export type AdminInviteSendRecord = {
  id: string;
  admin_id: string;
  admin_email: string;
  recipient_email: string;
  recipient_name: string;
  workgroup_ids: string[];
  draft_hash?: string | null;
  draft_excerpt?: string | null;
  status: 'sent' | 'skipped' | 'draft' | 'client_prepared';
  invitation_id?: string | null;
  send_mode?: string | null;
  source: string;
  created_at?: string | null;
};

export async function adminInviteIngestZoho(input: {
  agent_drop_name: string;
}): Promise<{
  success?: boolean;
  owner_email?: string;
  snapshot_path?: string;
  agent_drop_name?: string;
  contact_count?: number;
  message_count?: number;
  exported_at?: string;
  error?: string;
}> {
  const res = await fetch('/api/admin/invite-ai/ingest-zoho', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseJson(res);
}

export async function adminInviteSendRecords(input?: {
  recipient_email?: string;
  limit?: number;
}): Promise<{ records?: AdminInviteSendRecord[]; error?: string }> {
  const params = new URLSearchParams();
  if (input?.recipient_email) params.set('recipient_email', input.recipient_email);
  if (input?.limit) params.set('limit', String(input.limit));
  const query = params.toString();
  const res = await fetch(`/api/admin/invite-ai/send-records${query ? `?${query}` : ''}`, {
    credentials: 'include',
    cache: 'no-store',
  });
  return parseJson(res);
}

export async function adminInviteBatchHistory(input: {
  recipient_emails: string[];
}): Promise<{ history_by_email?: Record<string, AdminInviteSendRecord[]>; error?: string }> {
  const res = await fetch('/api/admin/invite-ai/batch/history', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseJson(res);
}

export async function adminInviteBatchRecord(input: {
  recipient_email: string;
  recipient_name?: string;
  primary_workgroup_id?: string;
  workgroup_ids?: string[];
  body?: string;
  status: 'skipped' | 'draft';
  source?: string;
}): Promise<{ record?: AdminInviteSendRecord; error?: string }> {
  const res = await fetch('/api/admin/invite-ai/batch/record', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseJson(res);
}
