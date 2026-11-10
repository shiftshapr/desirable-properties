import { NextResponse } from 'next/server';
import {
  passThrough,
  requireSteeringSession,
  steeringFetch,
  steeringPaths,
} from '@/lib/dp-steering-govhub.server';

type RouteContext = { params: Promise<{ batchId: string }> };

/** The viewer votes for every item in a batch except those left out (the batch's kind is the decision). */
export async function POST(request: Request, ctx: RouteContext) {
  const { batchId } = await ctx.params;
  if (!batchId?.trim()) return NextResponse.json({ error: 'batch id required' }, { status: 400 });
  const auth = await requireSteeringSession();
  if ('response' in auth) return auth.response;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const excludeIds = (Array.isArray(body.exclude_ids) ? body.exclude_ids : [])
    .map((id) => String(id).trim())
    .filter(Boolean);
  const note = String(body.note || '').trim().slice(0, 4000);
  return passThrough(
    await steeringFetch(steeringPaths.approveBatch(batchId), auth.idToken, {
      method: 'POST',
      body: JSON.stringify(note ? { exclude_ids: excludeIds, note } : { exclude_ids: excludeIds }),
    }),
  );
}
