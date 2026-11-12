import { NextResponse } from 'next/server';
import { stageKey, passThrough, steeringFetch, steeringPaths } from '@/lib/dp-steering-govhub.server';

type RouteContext = { params: Promise<{ key: string }> };

/** A closed stage's saved record, for anyone. */
export async function GET(_request: Request, ctx: RouteContext) {
  const key = stageKey((await ctx.params).key);
  if (!key) return NextResponse.json({ error: 'Not a stage' }, { status: 400 });
  return passThrough(await steeringFetch(steeringPaths.stage(key), null));
}
