import { NextResponse } from 'next/server';
import { mlOr400, passKey, passThrough, steeringFetch, steeringPaths } from '@/lib/dp-steering-govhub.server';

type RouteContext = { params: Promise<{ key: string; ml: string }> };

/** One document's items as they stood when a pass closed, for anyone. */
export async function GET(_request: Request, ctx: RouteContext) {
  const params = await ctx.params;
  const key = passKey(params.key);
  if (!key) return NextResponse.json({ error: 'Not a pass' }, { status: 400 });
  const parsed = mlOr400(params.ml);
  if ('response' in parsed) return parsed.response;
  return passThrough(await steeringFetch(steeringPaths.passDocument(key, parsed.ml), null));
}
