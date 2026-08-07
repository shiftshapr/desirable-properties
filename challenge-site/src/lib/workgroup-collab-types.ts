/** Shared types for workgroup chat + AI invite (Gov Hub ↔ challenge-site). */

export type WorkgroupMessage = {
  id: string;
  workgroup_id: string;
  author_user_id: string;
  author_name: string;
  body: string;
  created_at: string | null;
};

export type WorkgroupMessagesResponse = {
  messages: WorkgroupMessage[];
  is_member: boolean;
  can_post: boolean;
  teaser: boolean;
  count: number;
  error?: string;
};

export type WorkgroupCollabSummary = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  charter?: string | null;
  status?: string | null;
  state?: string | null;
  approval_status?: string | null;
  layer_id?: string | null;
  layer_name?: string | null;
  document_href?: string | null;
  document_label?: string | null;
  document_draft_ref?: string | null;
  can_invite_members?: boolean;
  can_edit?: boolean;
};

export type InviteCandidate = {
  name?: string;
  headline?: string;
  source_urls?: string[];
};

export type ResolvedPerson = {
  name?: string;
  headline?: string;
  summary?: string;
  expertise_tags?: string[];
};

export type SuggestedWorkgroup = {
  workgroup_id: string;
  name: string;
  slug?: string;
  rationale?: string;
};

export type PriorInvitation = {
  id?: string;
  status?: string;
  created_at?: string;
  workgroup_name?: string;
};

export type InviteResearchResponse = {
  success?: boolean;
  blocked?: boolean;
  error?: string;
  ambiguous?: boolean;
  candidates?: InviteCandidate[];
  resolved_person?: ResolvedPerson | null;
  suggested_workgroups?: SuggestedWorkgroup[];
  prior_invitations?: PriorInvitation[];
  corpus_meta?: {
    urls_fetched?: number;
    search_hits?: number;
    search_available?: boolean;
  };
};

export type InviteDraftResponse = {
  success?: boolean;
  blocked?: boolean;
  error?: string;
  draft?: string;
  tone?: string;
  length?: string;
  prior_invitations?: PriorInvitation[];
};

export type InviteSendMode = 'platform' | 'client';

export type InviteSendLink = {
  workgroup_name: string;
  landing_url: string;
};

export type InviteSendResponse = {
  success?: boolean;
  blocked?: boolean;
  error?: string;
  send_mode?: InviteSendMode;
  email_sent?: boolean;
  invitation_ids?: string[];
  links?: InviteSendLink[];
  mailto?: string;
  subject?: string;
  body?: string;
  to?: string;
};

export type InviteResearchInput = {
  name: string;
  email: string;
  linkedin_url?: string;
  previous_interaction?: string;
  extra_links?: string[];
  selected_candidate_index?: number | null;
};

export type InviteDraftInput = {
  name: string;
  email: string;
  tone?: string;
  length?: string;
  previous_interaction?: string;
  extra_guidance?: string;
  resolved_person?: ResolvedPerson | null;
  additional_workgroup_ids?: string[];
  prior_invitations?: PriorInvitation[];
};

export type InviteSendInput = {
  name: string;
  email: string;
  body: string;
  additional_workgroup_ids?: string[];
  send_mode: InviteSendMode;
};
