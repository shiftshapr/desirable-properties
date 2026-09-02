import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import {
  createCommunityHermesHand,
  getLastCommunityAmbientHandAt,
  isHermesAmbientDbConfigured,
} from '@/lib/dp-hermes-ambient-store';
import {
  callHermesAmbientAssess,
  parseExplicitHermesRequest,
} from '@/lib/hermes-ambient-server';
import type { HermesAmbientMode } from '@/lib/hermes-ambient-types';
import { DEFAULT_HERMES_WORKGROUP_SETTINGS } from '@/lib/hermes-ambient-types';
import { fetchCommunityMessagesServer } from '@/lib/community-messages.server';
import { fetchCommunityThreadAccessServer } from '@/lib/community-thread-access.server';
import { normalizeHermesThreadId } from '@/lib/hermes-community-collab';

type RouteCtx = { params: Promise<{ threadId: string }> };

export async function POST(request: Request, ctx: RouteCtx) {
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
    return NextResponse.json({ hand: null, skipped: 'db_not_configured' });
  }

  const access = await fetchCommunityThreadAccessServer(threadId, session);
  if (!access?.canPrompt) {
    return NextResponse.json({ error: 'Member invite required for Deepi' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const messageId = String(body.messageId || '').trim();
  const messageBody = String(body.messageBody || '').trim();
  const authorUserId = String(body.authorUserId || session.userId).trim();

  if (!messageId || !messageBody) {
    return NextResponse.json({ error: 'messageId and messageBody required' }, { status: 400 });
  }

  const settings = DEFAULT_HERMES_WORKGROUP_SETTINGS;
  const explicitRequest = parseExplicitHermesRequest(messageBody);

  let allowedModes = [...settings.allowedModes];
  if (
    settings.devilsAdvocateMode === 'request_only'
    && !explicitRequest
    && !allowedModes.includes('devils_advocate')
  ) {
    allowedModes = allowedModes.filter((m) => m !== 'devils_advocate');
  }

  if (!explicitRequest) {
    const lastAt = await getLastCommunityAmbientHandAt(threadId);
    if (lastAt && settings.cooldownMinutes > 0) {
      const elapsedMs = Date.now() - lastAt.getTime();
      if (elapsedMs < settings.cooldownMinutes * 60 * 1000) {
        return NextResponse.json({ hand: null, skipped: 'cooldown' });
      }
    }
  }

  const membership = await fetchCommunityMessagesServer(threadId, { session, full: true });
  const recentMessages = Array.isArray(body.recentMessages)
    ? body.recentMessages
    : membership.messages.slice(-12).map((m) => ({
        author_name: m.author_name,
        body: m.body,
      }));

  let assessment;
  try {
    assessment = await callHermesAmbientAssess({
      newMessage: { body: messageBody },
      recentMessages,
      allowedModes,
      explicitRequest,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Assessment failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (!assessment?.shouldRaise || !assessment.mode) {
    return NextResponse.json({ hand: null, assessment });
  }

  if (!explicitRequest && assessment.confidence < settings.confidenceThreshold) {
    return NextResponse.json({ hand: null, assessment, skipped: 'below_threshold' });
  }

  const hand = await createCommunityHermesHand({
    communityThreadId: threadId,
    triggerMessageId: messageId,
    triggerMessageBody: messageBody,
    triggerAuthorUserId: authorUserId,
    ownerUserId: session.userId,
    mode: assessment.mode as HermesAmbientMode,
    confidence: assessment.confidence,
    teaser: assessment.teaser || 'Deepi has a note for you.',
    requestedExplicitly: Boolean(explicitRequest?.explicit),
  });

  return NextResponse.json({ hand, assessment });
}
