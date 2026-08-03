import { NextResponse } from 'next/server';
import { requireSupportAdmin } from '@/lib/support-admin-auth';
import { publicTicketSummaryExtended, searchTickets, supportDataDir } from '@/lib/support-store';

export async function GET(request: Request) {
  const auth = await requireSupportAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const dataDir = supportDataDir();
  const result = await searchTickets(dataDir, {
    q: url.searchParams.get('q') || undefined,
    urgency: url.searchParams.get('urgency') || undefined,
    category: url.searchParams.get('category') || undefined,
    status: url.searchParams.get('status') || undefined,
    limit: Number(url.searchParams.get('limit') || 50),
    offset: Number(url.searchParams.get('offset') || 0),
  });

  return NextResponse.json({
    ok: true,
    total: result.total,
    tickets: result.tickets.map((t) => publicTicketSummaryExtended(t)),
  });
}
