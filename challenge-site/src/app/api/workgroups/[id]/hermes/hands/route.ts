import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readSession } from '@/lib/auth-session';
import { isEmailAdmin } from '@/lib/dp-admin-auth';
import {
  isHermesAmbientDbConfigured,
  listHermesHandsForUser,
  listPendingShareHands,
} from '@/lib/dp-hermes-ambient-store';
import { fetchWorkgroupMessagesServer } from '@/lib/workgroup-membership.server';

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: RouteCtx) {
  const { id: workgroupId } = await ctx.params;
  if (!workgroupId) {
    return NextResponse.json({ error: 'workgroup id required' }, { status: 400 });
  }

  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  if (!isHermesAmbientDbConfigured()) {
    return NextResponse.json({ hands: [], pending: [], configured: false });
  }

  const membership = await fetchWorkgroupMessagesServer(workgroupId, { session, full: true });
  if (!membership.is_member) {
    return NextResponse.json({ error: 'Workgroup membership required' }, { status: 403 });
  }

  const url = new URL(request.url);
  const queueOnly = url.searchParams.get('queue') === '1';

  const cookieStore = await cookies();
  const email = session.email?.trim().toLowerCase() || '';
  const isAdmin = email ? await isEmailAdmin(email) : false;

  if (queueOnly) {
    const pending = await listPendingShareHands(workgroupId, session.userId, isAdmin);
    return NextResponse.json({ pending, configured: true });
  }

  const hands = await listHermesHandsForUser(workgroupId, session.userId, { includeShared: true });
  const pending = await listPendingShareHands(workgroupId, session.userId, isAdmin);

  return NextResponse.json({ hands, pending, configured: true });
}
