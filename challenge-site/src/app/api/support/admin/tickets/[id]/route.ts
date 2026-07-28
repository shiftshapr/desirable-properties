import { NextResponse } from 'next/server';
import { requireSupportAdmin } from '@/lib/support-admin-auth';
import {
  patchTicket,
  readTicket,
  supportDataDir,
  ticketForHermes,
} from '@/lib/support-store';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireSupportAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const ticket = readTicket(supportDataDir(), id);
  if (!ticket) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, ticket: ticketForHermes(ticket) });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireSupportAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const result = patchTicket(supportDataDir(), id, {
    status: body.status != null ? String(body.status) : undefined,
    proposedResolution: body.proposedResolution as string | null | undefined,
    resolution: body.resolution as string | null | undefined,
    escalatedToHuman: body.escalatedToHuman as boolean | undefined,
    draftReply: body.draftReply as { subject?: string; body?: string } | undefined,
    note: body.note
      ? {
          ...(body.note as { kind?: 'investigation' | 'draft_reply' | 'system' | 'reply_sent'; text?: string }),
          author: auth.email,
        }
      : undefined,
  });

  if (!result.ok) {
    const code = result.error === 'not_found' ? 404 : 400;
    return NextResponse.json({ ok: false, error: result.error }, { status: code });
  }
  return NextResponse.json({ ok: true, ticket: ticketForHermes(result.ticket) });
}
