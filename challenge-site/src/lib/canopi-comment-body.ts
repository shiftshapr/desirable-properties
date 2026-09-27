/**
 * "Turn this into a Canopi comment" (Canopi spec §G): pure helpers, no path aliases so
 * node --test can load them. The comment is posted AS THE PERSON with AI-assisted provenance
 * (Canopi keeps aiAssist.{assisted, action, edited}); it is never posted as Deepi.
 */
export const COMMENT_PERSPECTIVES = ['builder', 'steward', 'skeptic'] as const;
export type CommentPerspective = (typeof COMMENT_PERSPECTIVES)[number];
export type CommentTargetKind = 'page' | 'reply' | 'quote';
export const MAX_COMMENT_CHARS = 2000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CommentPostInput = {
  content: unknown;
  perspective?: unknown;
  edited?: unknown;
  target?: { kind?: unknown; messageId?: unknown } | null;
};

export type CanopiCommentBody = {
  content: string;
  pageId: string;
  communityId: string;
  parentId?: string;
  quoteId?: string;
  sourceApp: string;
  aiAssist: { assisted: true; action: string; edited: boolean };
};

/** @returns the Canopi POST /api/messages body, or { error } for bad input. */
export function buildCanopiCommentBody(
  input: CommentPostInput,
  defaults: { pageId: string; communityId: string; sourceApp?: string },
): { body: CanopiCommentBody } | { error: string } {
  const content = typeof input.content === 'string' ? input.content.trim() : '';
  if (!content) return { error: 'content_required' };
  if (content.length > MAX_COMMENT_CHARS) return { error: 'content_too_long' };
  const perspective = COMMENT_PERSPECTIVES.includes(input.perspective as CommentPerspective)
    ? (input.perspective as CommentPerspective)
    : 'custom';
  const kind: CommentTargetKind = ['reply', 'quote'].includes(String(input.target?.kind)) ? (input.target!.kind as CommentTargetKind) : 'page';
  const messageId = typeof input.target?.messageId === 'string' ? input.target.messageId.trim() : '';
  if (kind !== 'page' && !UUID.test(messageId)) return { error: 'target_message_required' };
  const body: CanopiCommentBody = {
    content,
    pageId: defaults.pageId,
    communityId: defaults.communityId,
    sourceApp: defaults.sourceApp || 'deepi-comment',
    aiAssist: { assisted: true, action: `deepi_comment_${perspective}`, edited: input.edited === true },
  };
  if (kind === 'reply') body.parentId = messageId;
  if (kind === 'quote') body.quoteId = messageId;
  return { body };
}
