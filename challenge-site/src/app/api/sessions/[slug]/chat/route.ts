import { handleSessionChatGet, handleSessionChatPost } from '@/lib/sessions/session-chat-core';
import { sessionChatDeps } from '@/lib/sessions/session-chat.server';

/** Session chat for one occurrence. Signed-in only, read and post (see session-chat-core.ts). */
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  return handleSessionChatGet(slug, sessionChatDeps);
}

export async function POST(request: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  return handleSessionChatPost(request, slug, sessionChatDeps);
}
