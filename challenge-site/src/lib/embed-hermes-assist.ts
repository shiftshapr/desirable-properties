import {
  COMPOSE_AI_PLAIN_PROSE_RULE,
  buildComposeAiMessage,
} from '@/lib/compose-ai-prompts';
import { dpFocusFromPageUrl, embedHermesSurface } from '@/lib/embed-hermes-context';
import { hermesUpstreamHeaders } from '@/lib/hermes-proxy';
import { DP_COMMUNITY_AI, DP_COMMUNITY_AI_ERRORS, DP_COMMUNITY_AI_REALM } from '@/lib/dp-community-ai';
import { getHermesChatUrl } from '@/lib/web3auth-config';
import type { EmbedCanopiUser } from '@/lib/embed-hermes-proxy-auth';

const MAX_DRAFT_CHARS = 2000;

const ACTION_INSTRUCTIONS: Record<string, string> = {
  draft_reply:
    'Draft a thoughtful reply for this Discuss thread. Match a collaborative, governance-minded tone.',
  improve_writing: 'Improve clarity, flow, and grammar. Preserve intent and voice.',
  shorten: 'Shorten while preserving meaning.',
  expand: 'Expand with supporting detail. Stay on topic.',
  summarize_discussion: 'Summarize the discussion in 3–5 concise bullet points.',
  explain_context: 'Explain what this discussion is about and how the draft fits.',
  find_counterpoint:
    'Present the strongest good-faith opposing view. Prefix with: "Suggested opposing view (for discussion, not fact):"',
  add_sources:
    'Suggest supporting references only from URLs already in page or thread context. Never invent URLs.',
  improve_patch:
    'Improve the patch draft. Return labeled sections "Proposed replacement:" and "Rationale:" when appropriate.',
  shorten_patch_replacement: 'Shorten only the proposed replacement text.',
  neutralize_patch_replacement: 'Rewrite the replacement in a neutral, factual tone.',
  add_patch_evidence: 'Add concise evidence grounded only in supplied context.',
  draft_patch_rationale: 'Draft a concise rationale for reviewers.',
  shorten_patch_rationale: 'Shorten the rationale while preserving the core reason.',
  explain_patch_risk: 'Explain the risk of leaving the anchor text unchanged or accepting the replacement.',
};

type AssistContextPackage = {
  mode?: string;
  page?: { title?: string; url?: string; body?: string } | null;
  anchorQuote?: string | null;
  parentContent?: string;
  quoteContent?: string;
  threadSummary?: string;
  userDraft?: string;
};

function clampDraft(text: string): string {
  const trimmed = String(text || '').trim();
  if (trimmed.length <= MAX_DRAFT_CHARS) return trimmed;
  const slice = trimmed.slice(0, MAX_DRAFT_CHARS);
  const lastSpace = slice.lastIndexOf(' ');
  return lastSpace > MAX_DRAFT_CHARS * 0.75 ? slice.slice(0, lastSpace).trimEnd() : slice.trimEnd();
}

function contextLines(ctx: AssistContextPackage): string[] {
  const lines: string[] = [];
  if (ctx.page?.title) lines.push(`Page title: ${ctx.page.title}`);
  if (ctx.page?.url) lines.push(`Page URL: ${ctx.page.url}`);
  if (ctx.page?.body) lines.push(`Page content:\n${ctx.page.body}`);
  if (ctx.anchorQuote) lines.push(`Anchor selection:\n${ctx.anchorQuote}`);
  if (ctx.parentContent) lines.push(`Parent post:\n${ctx.parentContent}`);
  if (ctx.quoteContent) lines.push(`Quoted post:\n${ctx.quoteContent}`);
  if (ctx.threadSummary) lines.push(`Thread summary:\n${ctx.threadSummary}`);
  return lines;
}

export function buildAssistHermesMessage(options: {
  action: string;
  context: AssistContextPackage;
  userPrompt?: string;
}): { message: string; dpFocus: number | null; surface: string } {
  const { action, context, userPrompt } = options;
  const instruction =
    (userPrompt && String(userPrompt).trim()) ||
    ACTION_INSTRUCTIONS[action] ||
    ACTION_INSTRUCTIONS.draft_reply;
  const draft = context.userDraft || '';
  const message = buildComposeAiMessage({
    instruction: `${instruction}\n\n${COMPOSE_AI_PLAIN_PROSE_RULE}`,
    userDraft: draft,
    contextLines: contextLines(context),
  });
  const pageUrl = context.page?.url || null;
  return {
    message,
    dpFocus: dpFocusFromPageUrl(pageUrl),
    surface: embedHermesSurface('assist', pageUrl),
  };
}

export function buildAgentHermesMessage(options: {
  message: string;
  context?: Record<string, unknown>;
  pageContent?: {
    title?: string;
    url?: string;
    content?: { full?: string; chunks?: string[] };
    metadata?: Record<string, unknown>;
  };
}): { message: string; dpFocus: number | null; surface: string } {
  const pageUrl = options.pageContent?.url || (options.context?.pageUrl as string) || null;
  const title = options.pageContent?.title || (options.context?.pageTitle as string) || '';
  const body =
    options.pageContent?.content?.full ||
    (options.pageContent?.content?.chunks || []).join('\n\n') ||
    '';
  const relevant = (options.context?.relevantContent as string[] | undefined) || [];

  const contextBlock = [
    title ? `Page title: ${title}` : null,
    pageUrl ? `Page URL: ${pageUrl}` : null,
    body ? `Page content:\n${body.slice(0, 12000)}` : null,
    relevant.length ? `Relevant excerpts:\n${relevant.join('\n---\n')}` : null,
  ]
    .filter(Boolean)
    .join('\n\n');

  const message = [
    contextBlock,
    contextBlock ? '' : null,
    `User question:\n${String(options.message || '').trim()}`,
  ]
    .filter((line) => line !== null && line !== '')
    .join('\n');

  return {
    message,
    dpFocus: dpFocusFromPageUrl(pageUrl),
    surface: embedHermesSurface('agent', pageUrl),
  };
}

export async function callHermesForEmbed(options: {
  message: string;
  surface: string;
  dpFocus: number | null;
  canopiUser: EmbedCanopiUser;
  skipMemoryRecord?: boolean;
}): Promise<string> {
  const embedUserId = options.canopiUser.email || options.canopiUser.id || 'embed-user';
  const displayName = options.canopiUser.email || 'Discuss participant';
  const skipMemory = options.skipMemoryRecord ?? true;

  const upstream = await fetch(`${getHermesChatUrl()}/api/dp/chat`, {
    method: 'POST',
    headers: hermesUpstreamHeaders(),
    body: JSON.stringify({
      message: options.message,
      history: [],
      realm: DP_COMMUNITY_AI_REALM,
      surface: options.surface,
      dpFocus: options.dpFocus,
      verifierId: skipMemory ? null : embedUserId,
      displayName,
      govHubUserId: options.canopiUser.id || null,
      skipMemoryRecord: skipMemory,
    }),
  });

  const raw = await upstream.text();
  let data: { error?: string; response?: string } = {};
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(upstream.ok ? DP_COMMUNITY_AI_ERRORS.invalid_response : DP_COMMUNITY_AI_ERRORS.unavailable);
    }
  }
  if (!upstream.ok) {
    throw new Error(data.error || DP_COMMUNITY_AI_ERRORS.unavailable);
  }
  return clampDraft(data.response || '');
}
