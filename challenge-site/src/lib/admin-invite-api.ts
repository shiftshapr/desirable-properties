import type {
  InviteDraftInput,
  InviteDraftResponse,
  InviteResearchInput,
  InviteResearchResponse,
  InviteSendInput,
  InviteSendResponse,
  MessageStrategy,
  ZohoCommunicationStyle,
  ZohoContactContext,
} from '@/lib/workgroup-collab-types';

export type { MessageStrategy, ZohoCommunicationStyle, ZohoContactContext };

export type OutreachSelectionReason = {
  meta_layer_message_count: number;
  matched_via_message_count: boolean;
  matched_via_topics: boolean;
  matched_terms: string[];
  message_count: number;
  keyword_score: number;
  sample_subject_hits: string[];
};

export type ZohoContactCandidate = {
  id: string;
  name: string;
  email: string;
  confidence: 'high' | 'medium' | 'low';
  score: number;
  summary?: string;
  message_count?: number;
  meta_layer_message_count?: number;
  last_contact?: string;
  sample_subjects?: string[];
  snippets?: string[];
  communication_style?: ZohoCommunicationStyle;
  suggested_strategy?: MessageStrategy;
  message_strategy?: MessageStrategy;
  selection_reason?: OutreachSelectionReason;
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
  const data = (await res.json().catch(() => ({}))) as T & {
    error?: string;
    message?: string;
    code?: string;
    upstream_status?: number;
  };
  if (!res.ok) {
    const parts: string[] = [];
    if (typeof data?.message === 'string' && data.message.trim()) {
      parts.push(data.message.trim());
    } else if (typeof data?.error === 'string' && data.error.trim()) {
      parts.push(data.error.trim());
    }
    if (typeof data?.code === 'string' && data.code.trim()) {
      parts.push(`[${data.code.trim()}]`);
    }
    if (typeof data?.upstream_status === 'number') {
      parts.push(`upstream ${data.upstream_status}`);
    }
    const err = parts.length ? parts.join(' ') : `Request failed (${res.status})`;
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

export async function adminInvitePathwayZoho(input?: {
  show_hidden?: boolean;
}): Promise<{
  configured?: boolean;
  contacts?: ZohoContactCandidate[];
  error?: string;
  message_count?: number;
  source?: 'snapshot' | 'live';
  exported_at?: string;
  hidden_count?: number;
  visible_count?: number;
  show_hidden?: boolean;
}> {
  const res = await fetch('/api/admin/invite-ai/pathways/zoho', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ show_hidden: Boolean(input?.show_hidden) }),
  });
  return parseJson(res);
}

export async function adminInviteHideContact(input: {
  recipient_email: string;
  note?: string;
}): Promise<{ success?: boolean; hidden?: { reason?: string; note?: string }; error?: string }> {
  const res = await fetch('/api/admin/invite-ai/contacts/hide', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseJson(res);
}

export async function adminInviteGetSelection(): Promise<{
  success?: boolean;
  emails?: string[];
  updated_at?: string;
  error?: string;
}> {
  const res = await fetch('/api/admin/invite-ai/contacts/selection', {
    credentials: 'include',
    cache: 'no-store',
  });
  return parseJson(res);
}

export async function adminInviteSetSelection(input: {
  emails: string[];
}): Promise<{ success?: boolean; emails?: string[]; updated_at?: string; error?: string }> {
  const res = await fetch('/api/admin/invite-ai/contacts/selection', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseJson(res);
}

export async function adminInvitePatchSelection(input: {
  add?: string[];
  remove?: string[];
  email?: string;
  action?: 'add' | 'remove';
}): Promise<{ success?: boolean; emails?: string[]; updated_at?: string; error?: string }> {
  const res = await fetch('/api/admin/invite-ai/contacts/selection', {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseJson(res);
}

export async function adminInviteUnhideContact(input: {
  recipient_email: string;
}): Promise<{ success?: boolean; removed?: boolean; error?: string }> {
  const res = await fetch('/api/admin/invite-ai/contacts/unhide', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
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
  message_strategy?: MessageStrategy | null;
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
  message_strategy?: MessageStrategy;
}): Promise<{ record?: AdminInviteSendRecord; error?: string }> {
  const res = await fetch('/api/admin/invite-ai/batch/record', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseJson(res);
}

export type LongGapDispatchRow = {
  email: string;
  name: string;
  last_contact?: string;
  strategy?: MessageStrategy;
  subjects_snippet_summary?: string;
  dp_suggestion?: string | null;
  dp_label?: string;
  confidence?: 'high' | 'medium' | 'low';
  skip?: boolean;
  skip_reason?: string;
  intern_alum?: boolean;
  intern_alum_overridden?: boolean;
  dp_overridden?: boolean;
  skip_overridden?: boolean;
  intern_notes?: string;
  why?: string;
  classification_status?: 'pending' | 'done' | 'error';
  classification_error?: string;
  draft_status?: 'pending' | 'done' | 'error' | 'skipped';
  draft_body?: string;
  draft_error?: string;
  approved?: boolean;
  sample_subjects?: string[];
  snippets?: string[];
};

export type DispatchWorkgroupCatalogEntry = {
  id: string;
  name: string;
  slug?: string;
  description?: string;
};

export async function adminInviteDispatchReview(): Promise<{
  success?: boolean;
  total_long_gap?: number;
  dispatch_cutoff?: string;
  dispatch_cutoff_label?: string;
  rows?: LongGapDispatchRow[];
  workgroup_catalog?: DispatchWorkgroupCatalogEntry[];
  updated_at?: string;
  use_template_drafts?: boolean;
  template_mode_notice?: string;
  error?: string;
}> {
  const res = await fetch('/api/admin/invite-ai/dispatch/review', {
    credentials: 'include',
    cache: 'no-store',
  });
  return parseJson(res);
}

export async function adminInviteDispatchPatchRow(input: {
  email: string;
  dp_suggestion?: string | null;
  dp_label?: string;
  skip?: boolean;
  skip_reason?: string;
  approved?: boolean;
  intern_alum?: boolean;
  intern_notes?: string;
}): Promise<{ success?: boolean; row?: LongGapDispatchRow; error?: string }> {
  const res = await fetch('/api/admin/invite-ai/dispatch/review', {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseJson(res);
}

export async function adminInviteDispatchClassify(input?: {
  force?: boolean;
  emails?: string[];
}): Promise<{
  success?: boolean;
  classified?: number;
  total_long_gap?: number;
  rows?: Record<string, LongGapDispatchRow>;
  errors?: string[];
  error?: string;
}> {
  const res = await fetch('/api/admin/invite-ai/dispatch/classify', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input || {}),
  });
  return parseJson(res);
}

export async function adminInviteDispatchDraft(input?: {
  emails?: string[];
  force?: boolean;
}): Promise<{
  success?: boolean;
  job_id?: string;
  status?: string;
  total?: number;
  completed?: number;
  drafted?: number;
  errors?: number;
  current_email?: string;
  message?: string;
  rows?: Record<string, LongGapDispatchRow>;
  use_template_drafts?: boolean;
  error?: string;
}> {
  const res = await fetch('/api/admin/invite-ai/dispatch/draft', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input || {}),
  });
  return parseJson(res);
}

export async function adminInviteDispatchDraftStatus(): Promise<{
  success?: boolean;
  job_id?: string;
  status?: string;
  total?: number;
  completed?: number;
  drafted?: number;
  errors?: number;
  current_email?: string;
  error?: string;
  updated_at?: string;
}> {
  const res = await fetch('/api/admin/invite-ai/dispatch/draft/status', {
    credentials: 'include',
    cache: 'no-store',
  });
  return parseJson(res);
}

export type LongGapTemplateStructure = {
  greeting?: string;
  opening?: string;
  middle?: string;
  contribution?: string;
  no_dp?: string;
  with_dp?: string;
  signoff?: string;
  progression_image_url?: string;
};

export async function adminInviteDispatchTemplate(): Promise<{
  success?: boolean;
  template?: LongGapTemplateStructure;
  subject?: string;
  use_template_drafts?: boolean;
  error?: string;
}> {
  const res = await fetch('/api/admin/invite-ai/dispatch/template', {
    credentials: 'include',
    cache: 'no-store',
  });
  return parseJson(res);
}

export async function adminInviteDispatchSend(input: {
  email: string;
  test_mode?: boolean;
  test_recipient_email?: string;
}): Promise<{
  success?: boolean;
  test_mode?: boolean;
  test_for_email?: string;
  delivered_to?: string;
  send_records?: AdminInviteSendRecord[];
  error?: string;
  blocked?: boolean;
}> {
  const res = await fetch('/api/admin/invite-ai/dispatch/send', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseJson(res);
}

export type LongGapSendAllJobStatus = {
  success?: boolean;
  status?: 'idle' | 'running' | 'done' | 'error';
  job_id?: string;
  total?: number;
  already_sent?: number;
  completed?: number;
  sent?: number;
  skipped?: number;
  errors?: number;
  error_details?: Array<{ email?: string; error?: string }>;
  current_email?: string;
  error?: string;
  message?: string;
  job_mode?: 'send_all' | 'retry_failed';
  retry_available?: number;
  retry_already_sent?: number;
};

export async function adminInviteDispatchSendAll(): Promise<LongGapSendAllJobStatus> {
  const res = await fetch('/api/admin/invite-ai/dispatch/send-all', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test_mode: false }),
  });
  return parseJson(res);
}

export async function adminInviteDispatchSendAllStatus(): Promise<LongGapSendAllJobStatus> {
  const res = await fetch('/api/admin/invite-ai/dispatch/send-all/status', {
    credentials: 'include',
    cache: 'no-store',
  });
  return parseJson(res);
}

export async function adminInviteDispatchRetryFailed(): Promise<LongGapSendAllJobStatus> {
  const res = await fetch('/api/admin/invite-ai/dispatch/retry-failed', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test_mode: false }),
  });
  return parseJson(res);
}
