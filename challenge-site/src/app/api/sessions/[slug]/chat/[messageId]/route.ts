import { handleSessionChatPatch } from '@/lib/sessions/session-chat-core';
import { sessionChatDeps } from '@/lib/sessions/session-chat.server';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ slug: string; messageId: string }> };

/** Authors edit their own session chat messages. */
export async function PATCH(request: Request, ctx: Ctx) {
  const { slug, messageId } = await ctx.params;
  return handleSessionChatPatch(request, slug, messageId, sessionChatDeps);
}
