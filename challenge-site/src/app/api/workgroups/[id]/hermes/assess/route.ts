import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import {
  createHermesHand,
  getLastAmbientHandAt,
  getWorkgroupHermesSettings,
  isHermesAmbientDbConfigured,
} from '@/lib/dp-hermes-ambient-store';
import {
  callHermesAmbientAssess,
  parseExplicitHermesRequest,
} from '@/lib/hermes-ambient-server';
import type { HermesAmbientMode } from '@/lib/hermes-ambient-types';
import { fetchWorkgroupMessagesServer } from '@/lib/workgroup-membership.server';

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: RouteCtx) {
  const { id: workgroupId } = await ctx.params;
  if (!workgroupId) {
    return NextResponse.json({ error: 'workgroup id required' }, { status: 400 });
  }

  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  if (!isHermesAmbientDbConfigured()) {
    return NextResponse.json({ hand: null, skipped: 'db_not_configured' });
  }

  const membership = await fetchWorkgroupMessagesServer(workgroupId, { session, full: true });
  if (!membership.is_member) {
    return NextResponse.json({ error: 'Workgroup membership required' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const messageId = String(body.messageId || '').trim();
  const messageBody = String(body.messageBody || '').trim();
  const authorUserId = String(body.authorUserId || session.userId).trim();

  if (!messageId || !messageBody) {
    return NextResponse.json({ error: 'messageId and messageBody required' }, { status: 400 });
  }

  const settings = await getWorkgroupHermesSettings(workgroupId);
  const explicitRequest = parseExplicitHermesRequest(messageBody);

  let allowedModes = [...settings.allowedModes];
  if (
    settings.devilsAdvocateMode === 'request_only'
    && !explicitRequest
    && !allowedModes.includes('devils_advocate')
  ) {
    allowedModes = allowedModes.filter((m) => m !== 'devils_advocate');
  } else if (settings.devilsAdvocateMode === 'facilitator_enabled') {
    if (!allowedModes.includes('devils_advocate')) {
      allowedModes = [...allowedModes, 'devils_advocate'];
    }
  }

  if (!explicitRequest) {
    const lastAt = await getLastAmbientHandAt(workgroupId);
    if (lastAt && settings.cooldownMinutes > 0) {
      const elapsedMs = Date.now() - lastAt.getTime();
      if (elapsedMs < settings.cooldownMinutes * 60 * 1000) {
        return NextResponse.json({ hand: null, skipped: 'cooldown' });
      }
    }
  }

  const recentMessages = Array.isArray(body.recentMessages)
    ? body.recentMessages
    : (membership.messages || []).slice(-12).map((m) => ({
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

  const hand = await createHermesHand({
    workgroupId,
    triggerMessageId: messageId,
    triggerMessageBody: messageBody,
    triggerAuthorUserId: authorUserId,
    ownerUserId: session.userId,
    mode: assessment.mode as HermesAmbientMode,
    confidence: assessment.confidence,
    teaser: assessment.teaser || 'Hermes has a note for you.',
    requestedExplicitly: Boolean(explicitRequest?.explicit),
  });

  return NextResponse.json({ hand, assessment });
}
