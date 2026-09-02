import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import {
  getHermesHandById,
  isHermesAmbientDbConfigured,
  updateHermesHand,
} from '@/lib/dp-hermes-ambient-store';
import { HERMES_MODE_LABELS } from '@/lib/hermes-ambient-types';
import { SHARED_DEEPI_MESSAGE_PREFIX } from '@/lib/workgroup-hermes-share';
import { createCommunityChatMessage } from '@/lib/community-chat-store';
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
  if (!access?.canPost) {
    return NextResponse.json({ error: 'Member invite required to share' }, { status: 403 });
  }

  const hand = await getHermesHandById(handId);
  if (!hand || hand.communityThreadId !== threadId) {
    return NextResponse.json({ error: 'Hand not found' }, { status: 404 });
  }
  if (hand.ownerUserId !== session.userId) {
    return NextResponse.json({ error: 'Not authorized for this hand' }, { status: 403 });
  }
  if (!hand.fullReply) {
    return NextResponse.json({ error: 'Open the hand first to generate a reply' }, { status: 400 });
  }
  if (hand.status === 'shared') {
    return NextResponse.json({ hand, message: 'Already shared' });
  }

  const modeLabel = HERMES_MODE_LABELS[hand.mode] || hand.mode;
  const shareBody = `${SHARED_DEEPI_MESSAGE_PREFIX}${modeLabel})*\n\n${hand.fullReply}`;
  const authorName = session.displayName?.trim()
    || session.username?.trim()
    || session.email?.trim()
    || 'Member';

  const message = await createCommunityChatMessage({
    communityThreadId: threadId,
    authorUserId: session.userId,
    authorName,
    body: shareBody,
    source: 'deepi_shared',
  });

  const updated = await updateHermesHand(handId, {
    status: 'shared',
    visibility: 'shared',
    sharedMessageId: message.id,
    sharedAt: new Date(),
  });

  return NextResponse.json({ hand: updated, message });
}
