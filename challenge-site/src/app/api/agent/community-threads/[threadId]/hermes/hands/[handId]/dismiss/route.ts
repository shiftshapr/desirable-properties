import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import {
  getHermesHandById,
  isHermesAmbientDbConfigured,
  updateHermesHand,
} from '@/lib/dp-hermes-ambient-store';
import { fetchCommunityThreadAccessServer } from '@/lib/community-thread-access.server';
import { normalizeHermesThreadId } from '@/lib/hermes-community-collab';

type RouteCtx = { params: Promise<{ threadId: string; handId: string }> };

export async function POST(_request: Request, ctx: RouteCtx) {
  const { threadId: rawId, handId } = await ctx.params;
  const threadId = normalizeHermesThreadId(rawId);
  if (!threadId || !handId) {
    return NextResponse.json({ error: 'thread id and hand id required' }, { status: 400 });
  }

  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  if (!isHermesAmbientDbConfigured()) {
    return NextResponse.json({ error: 'Ambient Hermes database not configured' }, { status: 503 });
  }

  const access = await fetchCommunityThreadAccessServer(threadId, session);
  if (!access?.canPrompt) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const hand = await getHermesHandById(handId);
  if (!hand || hand.communityThreadId !== threadId) {
    return NextResponse.json({ error: 'Hand not found' }, { status: 404 });
  }
  if (hand.ownerUserId !== session.userId) {
    return NextResponse.json({ error: 'Not authorized for this hand' }, { status: 403 });
  }

  const updated = await updateHermesHand(handId, {
    status: 'dismissed',
    dismissedAt: new Date(),
  });

  return NextResponse.json({ hand: updated });
}
