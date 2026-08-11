import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import {
  getHermesHandById,
  isHermesAmbientDbConfigured,
  updateHermesHand,
} from '@/lib/dp-hermes-ambient-store';
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

  const updated = await updateHermesHand(handId, {
    status: 'dismissed',
    dismissedAt: new Date(),
  });

  return NextResponse.json({ hand: updated });
}
