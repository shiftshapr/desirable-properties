import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { rateStyleCheck } from '@/lib/style-check.server';
import { resolveWorkgroupMembership } from '@/lib/workgroup-membership.server';

type RouteContext = { params: Promise<{ id: string }> };

/** A member rates a style note helpful or not; feeds the admin quality audit. */
export async function POST(request: Request, ctx: RouteContext) {
  const { id: workgroupId } = await ctx.params;
  const session = await readSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }
  if (!(await resolveWorkgroupMembership(workgroupId, session.userId))) {
    return NextResponse.json({ error: 'Workgroup membership required' }, { status: 403 });
  }
  const body = (await request.json().catch(() => ({}))) as {
    checkId?: string;
    helpful?: boolean;
    comment?: string;
  };
  if (!body.checkId || typeof body.helpful !== 'boolean') {
    return NextResponse.json({ error: 'checkId and helpful (true|false) required' }, { status: 400 });
  }
  const by = session.displayName || session.username || session.userId;
  const ok = await rateStyleCheck(body.checkId, { helpful: body.helpful, by, comment: body.comment });
  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: 'Style check not found' }, { status: 404 });
}
