import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import {
  getHermesHandById,
  isHermesAmbientDbConfigured,
  updateHermesHand,
} from '@/lib/dp-hermes-ambient-store';
import { HERMES_MODE_LABELS } from '@/lib/hermes-ambient-types';
import { SHARED_DEEPI_MESSAGE_PREFIX } from '@/lib/workgroup-hermes-share';
import { proxyGovHubJson } from '@/lib/govhub-proxy';
import { fetchWorkgroupMessagesServer } from '@/lib/workgroup-membership.server';

type RouteCtx = { params: Promise<{ id: string; handId: string }> };

export async function POST(_request: Request, ctx: RouteCtx) {
  const { id: workgroupId, handId } = await ctx.params;
  if (!workgroupId || !handId) {
    return NextResponse.json({ error: 'workgroup id and hand id required' }, { status: 400 });
  }

  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  if (!isHermesAmbientDbConfigured()) {
    return NextResponse.json({ error: 'Ambient Hermes database not configured' }, { status: 503 });
  }

  const membership = await fetchWorkgroupMessagesServer(workgroupId, { session, full: true });
  if (!membership.is_member) {
    return NextResponse.json({ error: 'Workgroup membership required' }, { status: 403 });
  }

  const hand = await getHermesHandById(handId);
  if (!hand || hand.workgroupId !== workgroupId) {
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

  const posted = await proxyGovHubJson(
    `/api/workgroups/${encodeURIComponent(workgroupId)}/messages/`,
    { method: 'POST', body: { body: shareBody } },
  );

  if (posted.status < 200 || posted.status >= 300) {
    const err = await posted.json().catch(() => ({})) as { error?: string };
    return NextResponse.json(
      { error: typeof err.error === 'string' ? err.error : 'Failed to post to workgroup' },
      { status: posted.status },
    );
  }

  const result = await posted.json().catch(() => ({})) as { message?: { id?: string } };
  const sharedMessageId = result?.message?.id ? String(result.message.id) : null;

  const updated = await updateHermesHand(handId, {
    status: 'shared',
    visibility: 'shared',
    sharedMessageId: sharedMessageId || undefined,
    sharedAt: new Date(),
  });

  return NextResponse.json({ hand: updated, message: result?.message || null });
}
