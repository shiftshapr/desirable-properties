import { NextResponse } from 'next/server';
import { publicTicketSummary, searchTickets, supportDataDir } from '@/lib/support-store';

function opsAuthorized(request: Request) {
  const secret = process.env.DP_SUPPORT_OPS_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get('authorization') || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const alt = request.headers.get('x-dp-support-ops-secret')?.trim() || '';
  return bearer === secret || alt === secret;
}

export async function GET(request: Request) {
  if (!opsAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const dataDir = supportDataDir();
  const result = searchTickets(dataDir, {
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
    tickets: result.tickets.map((t) => ({
      ...publicTicketSummary(t),
      body: t.body,
      email: t.email,
      handle: t.handle,
      userId: t.userId,
      stepsToReproduce: t.stepsToReproduce,
      actualBehavior: t.actualBehavior,
      expectedBehavior: t.expectedBehavior,
      triedAlready: t.triedAlready,
      diagnosticBundle: t.diagnosticBundle,
      hasScreenshots: t.hasScreenshots,
    })),
  });
}
