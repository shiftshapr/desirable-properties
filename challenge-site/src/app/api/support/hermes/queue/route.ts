import { NextResponse } from 'next/server';
import { hermesAuthorized } from '@/lib/support-hermes-auth';
import { publicTicketSummary, searchTickets, supportDataDir } from '@/lib/support-store';

export async function GET(request: Request) {
  if (!hermesAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const dataDir = supportDataDir();
  const result = await searchTickets(dataDir, {
    q: url.searchParams.get('q') || undefined,
    urgency: url.searchParams.get('urgency') || undefined,
    category: url.searchParams.get('category') || undefined,
    status: url.searchParams.get('status') || undefined,
    userId: url.searchParams.get('userId') || undefined,
    limit: Number(url.searchParams.get('limit') || 50),
    offset: Number(url.searchParams.get('offset') || 0),
  });

  return NextResponse.json({
    ok: true,
    ...result,
    tickets: result.tickets.map((t) => ({
      ...publicTicketSummary(t),
      escalatedToHuman: t.escalatedToHuman,
      email: t.email,
      handle: t.handle,
    })),
  });
}
