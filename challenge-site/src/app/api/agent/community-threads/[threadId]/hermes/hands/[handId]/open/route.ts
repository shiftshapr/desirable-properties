import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import {
  getHermesHandById,
  isHermesAmbientDbConfigured,
  updateHermesHand,
} from '@/lib/dp-hermes-ambient-store';
import { callHermesAmbientReply } from '@/lib/hermes-ambient-server';
import { fetchCommunityMessagesServer } from '@/lib/community-messages.server';
import { fetchCommunityThreadAccessServer } from '@/lib/community-thread-access.server';
import { normalizeHermesThreadId } from '@/lib/hermes-community-collab';

type RouteCtx = { params: Promise<{ threadId: string; handId: string }> };

export async function POST(request: Request, ctx: RouteCtx) {
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
    return NextResponse.json({ error: 'Member invite required for Deepi' }, { status: 403 });
  }

  const hand = await getHermesHandById(handId);
  if (!hand || hand.communityThreadId !== threadId) {
    return NextResponse.json({ error: 'Hand not found' }, { status: 404 });
  }
  if (hand.ownerUserId !== session.userId) {
    return NextResponse.json({ error: 'Not authorized for this hand' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const dpFocus = body.dpFocus != null ? Number(body.dpFocus) : null;

  let fullReply = hand.fullReply;
  if (!fullReply) {
    const membership = await fetchCommunityMessagesServer(threadId, { session, full: true });
    const recentMessages = Array.isArray(body.recentMessages)
      ? body.recentMessages
      : membership.messages.slice(-12).map((m) => ({
          author_name: m.author_name,
          body: m.body,
        }));

    try {
      const generated = await callHermesAmbientReply({
        mode: hand.mode,
        newMessage: { body: hand.triggerMessageBody },
        recentMessages,
        dpFocus: Number.isFinite(dpFocus) ? dpFocus : null,
      });
      fullReply = generated.reply;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Reply generation failed';
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  const updated = await updateHermesHand(handId, {
    status: 'opened',
    fullReply,
    openedAt: hand.openedAt ? new Date(hand.openedAt) : new Date(),
  });

  return NextResponse.json({ hand: updated });
}
