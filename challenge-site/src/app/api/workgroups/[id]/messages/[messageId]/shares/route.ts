import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import {
  createWorkgroupMessageShare,
  isWorkgroupShareDbConfigured,
} from '@/lib/dp-workgroup-share-store';
import { fetchWorkgroupMessagesServer } from '@/lib/workgroup-membership.server';
import {
  fetchUserWorkgroupPositions,
  resolveWorkgroupRecipient,
} from '@/lib/workgroup-members-roster.server';
import {
  canGrantWorkgroupShareControl,
  canMemberShareMessage,
  type WorkgroupShareRole,
} from '@/lib/workgroup-share-restrictions';
import type { WorkgroupMessage } from '@/lib/workgroup-collab-types';

type RouteCtx = { params: Promise<{ id: string; messageId: string }> };

function parseSendeeRole(value: unknown, allowed: boolean): WorkgroupShareRole {
  if (value === 'controller' && allowed) return 'controller';
  return 'watcher';
}

export async function POST(request: Request, ctx: RouteCtx) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const { id: workgroupId, messageId } = await ctx.params;
  if (!workgroupId?.trim() || !messageId?.trim()) {
    return NextResponse.json({ error: 'workgroup id and message id required' }, { status: 400 });
  }

  if (!isWorkgroupShareDbConfigured()) {
    return NextResponse.json({ error: 'Workgroup share storage not configured' }, { status: 503 });
  }

  const membership = await fetchWorkgroupMessagesServer(workgroupId, { session, full: true });
  if (!membership.is_member) {
    return NextResponse.json({ error: 'Workgroup membership required' }, { status: 403 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  if (body.mode === 'link') {
    return NextResponse.json(
      { error: 'Public expiring links are disabled for workgroup chat shares' },
      { status: 400 },
    );
  }

  const recipientQuery = String(body.recipient || body.recipientUserId || '').trim();
  const recipientResult = await resolveWorkgroupRecipient(workgroupId, recipientQuery, {
    excludeUserId: session.userId,
  });
  if ('error' in recipientResult) {
    return NextResponse.json({ error: recipientResult.error }, { status: 400 });
  }

  const messages = membership.messages || [];
  const message = messages.find((m) => m.id === messageId) as WorkgroupMessage | undefined;
  if (!message) {
    return NextResponse.json({ error: 'Message not found in this workgroup' }, { status: 404 });
  }

  const positions = await fetchUserWorkgroupPositions(workgroupId, session.userId);
  if (!canMemberShareMessage(message, session.userId, positions)) {
    return NextResponse.json(
      {
        error:
          'You can only share your own messages or Deepi messages marked shareable. Facilitators may share any visible message.',
      },
      { status: 403 },
    );
  }

  const canGrantControl = canGrantWorkgroupShareControl(message, session.userId, positions);
  const sendeeRole = parseSendeeRole(body.sendeeRole, canGrantControl);
  if (body.sendeeRole === 'controller' && !canGrantControl) {
    return NextResponse.json(
      {
        error: 'Control permission requires facilitator role or sharing your own message.',
      },
      { status: 403 },
    );
  }

  const note = typeof body.note === 'string' ? body.note : undefined;

  const share = await createWorkgroupMessageShare({
    workgroupId,
    anchorMessageId: messageId,
    sharerUserId: session.userId,
    recipientUserId: recipientResult.member.user_id,
    sendeeRole,
    note,
  });

  return NextResponse.json(
    {
      share,
      recipient: {
        user_id: recipientResult.member.user_id,
        user_name: recipientResult.member.user_name,
      },
      anchorMessageId: messageId,
      visibility: 'from_share_point',
      linkDisabled: true,
    },
    { status: 201 },
  );
}
