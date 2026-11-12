import { mlOr400, passThrough, requireSteeringSession, steeringFetch, steeringPaths } from '@/lib/dp-steering-govhub.server';

type RouteContext = { params: Promise<{ ml: string }> };

/** Keep every carried item on this document that the stage's analysis found no issue with. */
export async function POST(request: Request, ctx: RouteContext) {
  const parsed = mlOr400((await ctx.params).ml);
  if ('response' in parsed) return parsed.response;
  const auth = await requireSteeringSession();
  if ('response' in auth) return auth.response;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const exclude = Array.isArray(body.exclude_ids) ? body.exclude_ids.filter((x) => typeof x === 'string').slice(0, 500) : [];
  return passThrough(
    await steeringFetch(steeringPaths.keepAll(parsed.ml), auth.idToken, {
      method: 'POST',
      body: JSON.stringify({ exclude_ids: exclude, stage_key: typeof body.stage_key === 'string' ? body.stage_key.slice(0, 40) : undefined }),
    }),
  );
}
