import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import {
  isHermesAmbientDbConfigured,
  listCommunityHermesHandsForUser,
  listPendingCommunityShareHands,
} from '@/lib/dp-hermes-ambient-store';
import { fetchCommunityThreadAccessServer } from '@/lib/community-thread-access.server';
import { normalizeHermesThreadId } from '@/lib/hermes-community-collab';

type RouteCtx = { params: Promise<{ threadId: string }> };

export async function GET(_request: Request, ctx: RouteCtx) {
  const { threadId: rawId } = await ctx.params;
  const threadId = normalizeHermesThreadId(rawId);
  if (!threadId) {
    return NextResponse.json({ error: 'thread id required' }, { status: 400 });
  }

  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  if (!isHermesAmbientDbConfigured()) {
    return NextResponse.json({ hands: [], pending: [], configured: false });
  }

  const access = await fetchCommunityThreadAccessServer(threadId, session);
  if (!access?.canRead) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const hands = await listCommunityHermesHandsForUser(threadId, session.userId, {
    includeShared: true,
  });
  const pending = await listPendingCommunityShareHands(threadId, session.userId);

  return NextResponse.json({ hands, pending, configured: true });
}
