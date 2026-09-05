import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { fetchWorkgroupMessagesServer } from '@/lib/workgroup-membership.server';
import { fetchWorkgroupRoster } from '@/lib/workgroup-members-roster.server';

type RouteCtx = { params: Promise<{ id: string }> };

/** Member-only roster for workgroup share recipient autocomplete. */
export async function GET(_request: Request, ctx: RouteCtx) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const { id: workgroupId } = await ctx.params;
  if (!workgroupId?.trim()) {
    return NextResponse.json({ error: 'workgroup id required' }, { status: 400 });
  }

  const membership = await fetchWorkgroupMessagesServer(workgroupId, { session, full: true });
  if (!membership.is_member) {
    return NextResponse.json({ error: 'Workgroup membership required' }, { status: 403 });
  }

  const members = await fetchWorkgroupRoster(workgroupId);
  return NextResponse.json({
    members: members.map((m) => ({
      user_id: m.user_id,
      user_name: m.user_name,
      joined_at: m.joined_at,
      positions: m.positions,
      is_facilitator: m.is_facilitator,
    })),
  });
}
