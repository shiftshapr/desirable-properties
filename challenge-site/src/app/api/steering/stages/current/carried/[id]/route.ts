import { NextResponse } from 'next/server';
import { passThrough, requireSteeringSession, steeringFetch, steeringPaths } from '@/lib/dp-steering-govhub.server';

type RouteContext = { params: Promise<{ id: string }> };

const idOk = (id: string) => /^[0-9a-f-]{8,36}$/i.test(id);

/** Review an item carried into the open stage: keep, follow_up or defer (the last two with a note). */
export async function POST(request: Request, ctx: RouteContext) {
  const { id } = await ctx.params;
  if (!idOk(id)) return NextResponse.json({ error: 'Not a proposal id' }, { status: 400 });
  const auth = await requireSteeringSession();
  if ('response' in auth) return auth.response;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const text = (k: string, max: number) => (typeof body[k] === 'string' ? (body[k] as string).slice(0, max) : undefined);
  return passThrough(
    await steeringFetch(steeringPaths.reviewCarried(id), auth.idToken, {
      method: 'POST',
      body: JSON.stringify({ decision: text('decision', 20), note: text('note', 4000), stage_key: text('stage_key', 40) }),
    }),
  );
}

/** Withdraw your review. */
export async function DELETE(_request: Request, ctx: RouteContext) {
  const { id } = await ctx.params;
  if (!idOk(id)) return NextResponse.json({ error: 'Not a proposal id' }, { status: 400 });
  const auth = await requireSteeringSession();
  if ('response' in auth) return auth.response;
  return passThrough(await steeringFetch(steeringPaths.reviewCarried(id), auth.idToken, { method: 'DELETE' }));
}
