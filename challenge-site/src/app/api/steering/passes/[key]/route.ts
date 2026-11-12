import { NextResponse } from 'next/server';
import { passKey, passThrough, steeringFetch, steeringPaths } from '@/lib/dp-steering-govhub.server';

type RouteContext = { params: Promise<{ key: string }> };

/** A closed pass's saved record, for anyone. */
export async function GET(_request: Request, ctx: RouteContext) {
  const key = passKey((await ctx.params).key);
  if (!key) return NextResponse.json({ error: 'Not a pass' }, { status: 400 });
  return passThrough(await steeringFetch(steeringPaths.pass(key), null));
}
