import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { sendCommunityChatInviteEmails } from '@/lib/dp-community-invite-email';
import { hermesUpstreamHeaders } from '@/lib/hermes-proxy';
import { getHermesChatUrl } from '@/lib/web3auth-config';

interface RouteParams {
  params: Promise<{ id: string }>;
}

function collectInviteEmailRecipients(
  body: Record<string, unknown>,
  share: Record<string, unknown> | undefined,
): Array<{ email: string }> {
  const rows: Array<{ email: string }> = [];
  const seen = new Set<string>();

  const addEmail = (raw: unknown) => {
    const email = String(raw || '').trim().toLowerCase();
    if (!email.includes('@') || seen.has(email)) return;
    seen.add(email);
    rows.push({ email });
  };

  if (Array.isArray(body.recipients)) {
    for (const row of body.recipients) {
      if (!row || typeof row !== 'object') continue;
      const rec = row as Record<string, unknown>;
      addEmail(rec.recipientEmail ?? rec.email);
    }
  }

  addEmail(body.recipientEmail);

  if (share && Array.isArray(share.recipients)) {
    for (const row of share.recipients) {
      if (!row || typeof row !== 'object') continue;
      addEmail((row as Record<string, unknown>).email);
    }
  }

  return rows;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const { id } = await params;
  const upstream = await fetch(
    `${getHermesChatUrl()}/api/hermes/threads/${encodeURIComponent(id)}/shares?verifierId=${encodeURIComponent(session.verifierId)}`,
    { headers: hermesUpstreamHeaders(), signal: AbortSignal.timeout(15000) },
  );
  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const upstream = await fetch(
    `${getHermesChatUrl()}/api/hermes/threads/${encodeURIComponent(id)}/shares`,
    {
      method: 'POST',
      headers: hermesUpstreamHeaders(),
      body: JSON.stringify({
        verifierId: session.verifierId,
        sendeeRole: body.sendeeRole || (body.communityInvite ? 'member' : 'watcher'),
        visibility: body.visibility || 'full',
        senderRetainsWatch: body.senderRetainsWatch !== false,
        expiresInHours: body.expiresInHours ?? 24,
        anchorTurnId: body.anchorTurnId || undefined,
        recipientEmail: body.recipientEmail || undefined,
        workgroupId: body.workgroupId || undefined,
        shareMode: body.shareMode || undefined,
        recipientVerifierId: body.recipientVerifierId || undefined,
        recipients: Array.isArray(body.recipients) ? body.recipients : undefined,
        shareThreadKind: body.shareThreadKind === 'fork_snapshot' ? 'fork_snapshot' : 'live',
      }),
      signal: AbortSignal.timeout(15000),
    },
  );
  const data = (await upstream.json().catch(() => ({}))) as Record<string, unknown>;

  if (
    upstream.ok
    && data.directDelivered
    && body.sendInviteEmail !== false
    && (body.communityInvite === true || Array.isArray(body.recipients))
  ) {
    const inviteMessage = String(body.inviteMessage || '').trim().slice(0, 500);
    const chatTitle = String(body.chatTitle || body.threadTitle || 'Community Chat').trim();
    const inviterName =
      String(session.displayName || '').trim()
      || String(session.username || '').trim()
      || 'A community member';

    const emailRecipients = collectInviteEmailRecipients(body, data.share as Record<string, unknown> | undefined);
    if (emailRecipients.length > 0) {
      data.inviteEmails = await sendCommunityChatInviteEmails({
        recipients: emailRecipients,
        inviterName,
        chatTitle,
        inviteMessage: inviteMessage || undefined,
      });
    }
  }

  return NextResponse.json(data, { status: upstream.status });
}
