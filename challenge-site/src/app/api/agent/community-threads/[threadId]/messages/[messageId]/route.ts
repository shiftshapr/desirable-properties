import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { patchCommunityMessageServer } from '@/lib/community-messages.server';
import { normalizeHermesThreadId } from '@/lib/hermes-community-collab';

type RouteCtx = { params: Promise<{ threadId: string; messageId: string }> };

export async function PATCH(request: Request, ctx: RouteCtx) {
  const { threadId: rawThreadId, messageId } = await ctx.params;
  const threadId = normalizeHermesThreadId(rawThreadId);
  if (!threadId) {
    return NextResponse.json({ error: 'thread id required' }, { status: 400 });
  }

  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as { body?: string };
  const result = await patchCommunityMessageServer(threadId, messageId, String(body.body || ''), session);
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ success: true, message: result.message });
}
