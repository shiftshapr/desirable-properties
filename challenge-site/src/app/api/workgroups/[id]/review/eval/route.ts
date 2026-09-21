import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { resolveWorkgroupMembership } from '@/lib/workgroup-membership.server';
import { upsertReviewEval } from '@/lib/workgroup-review-store';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: RouteContext) {
  const { id: workgroupId } = await ctx.params;
  if (!workgroupId?.trim()) {
    return NextResponse.json({ error: 'workgroup id required' }, { status: 400 });
  }

  const session = await readSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const isMember = await resolveWorkgroupMembership(workgroupId, session.userId);
  if (!isMember) {
    return NextResponse.json({ error: 'Workgroup membership required' }, { status: 403 });
  }

  let body: { itemKey?: string; vote?: string; comment?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const itemKey = String(body.itemKey || '').trim();
  const vote = String(body.vote || '').trim().toLowerCase();
  if (!itemKey || (vote !== 'yes' && vote !== 'no')) {
    return NextResponse.json({ error: 'itemKey and vote (yes|no) required' }, { status: 400 });
  }

  const saved = await upsertReviewEval({
    workgroupId,
    itemKey,
    userId: session.userId,
    userName: session.displayName || session.username || 'Member',
    vote,
    comment: body.comment,
  });
  if (!saved) {
    return NextResponse.json({ error: 'Review storage unavailable' }, { status: 503 });
  }
  return NextResponse.json({ eval: saved });
}
