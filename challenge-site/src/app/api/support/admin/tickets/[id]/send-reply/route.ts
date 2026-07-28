import { NextResponse } from 'next/server';
import { requireSupportAdmin } from '@/lib/support-admin-auth';
import { sendSupportReplyEmail } from '@/lib/support-notify';
import {
  markDraftReplySent,
  patchTicket,
  readTicket,
  supportDataDir,
  ticketForHermes,
} from '@/lib/support-store';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireSupportAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const dataDir = supportDataDir();
  const ticket = readTicket(dataDir, id);
  if (!ticket) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (body.draftReply && typeof body.draftReply === 'object') {
    patchTicket(dataDir, id, {
      draftReply: body.draftReply as { subject?: string; body?: string },
    });
  }

  const fresh = readTicket(dataDir, id)!;
  const emailResult = await sendSupportReplyEmail(fresh, {
    subject: body.subject != null ? String(body.subject) : undefined,
    body: body.body != null ? String(body.body) : undefined,
  });

  if (!emailResult.ok) {
    return NextResponse.json(
      { ok: false, error: emailResult.error || 'send_failed' },
      { status: 400 },
    );
  }

  const updated = markDraftReplySent(dataDir, id, auth.email);
  return NextResponse.json({
    ok: true,
    emailId: emailResult.id,
    ticket: ticketForHermes(updated.ticket!),
  });
}
