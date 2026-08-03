import { NextResponse } from 'next/server';
import { hermesAuthorized } from '@/lib/support-hermes-auth';
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
  if (!hermesAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const dataDir = supportDataDir();
  const ticket = await readTicket(dataDir, id);
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
    await patchTicket(dataDir, id, {
      draftReply: body.draftReply as { subject?: string; body?: string },
    });
  }

  const fresh = (await readTicket(dataDir, id))!;
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

  const updated = await markDraftReplySent(dataDir, id, 'hermes');
  return NextResponse.json({
    ok: true,
    emailId: emailResult.id,
    ticket: ticketForHermes(updated.ticket!),
  });
}
