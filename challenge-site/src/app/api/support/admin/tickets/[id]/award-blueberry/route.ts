import { NextResponse } from 'next/server';
import { requireSupportAdmin } from '@/lib/support-admin-auth';
import { awardSupportTicketBlueberry } from '@/lib/dp-support-blueberry';
import { supportDataDir, ticketForHermes } from '@/lib/support-store';
import { pgReadTicket } from '@/lib/dp-support-store';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireSupportAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const result = await awardSupportTicketBlueberry({
    ticketId: id,
    awardedBy: auth.email,
    blueberryId: body.blueberryId ? String(body.blueberryId) : undefined,
  });

  if (!result.ok) {
    const code =
      result.error === 'not_found'
        ? 404
        : result.error === 'already_awarded' || result.error === 'category_mismatch'
          ? 409
          : 400;
    return NextResponse.json(
      { ok: false, error: result.error, message: 'message' in result ? result.message : result.error },
      { status: code },
    );
  }

  const ticket = result.ticket || (await pgReadTicket(supportDataDir(), id));
  return NextResponse.json({
    ok: true,
    awardedAt: result.awardedAt,
    userId: result.userId,
    ticket: ticket ? ticketForHermes(ticket) : null,
  });
}
