import {
  mlOr400,
  passThrough,
  requireSteeringSession,
  steeringFetch,
  steeringPaths,
} from '@/lib/dp-steering-govhub.server';

type RouteContext = { params: Promise<{ ml: string; proposalId: string }> };

/** Withdraw the viewer's active vote (Gov Hub refuses once the outcome has been carried out). */
export async function DELETE(_request: Request, ctx: RouteContext) {
  const { ml: rawMl, proposalId } = await ctx.params;
  const parsed = mlOr400(rawMl);
  if ('response' in parsed) return parsed.response;
  const auth = await requireSteeringSession();
  if ('response' in auth) return auth.response;
  return passThrough(
    await steeringFetch(steeringPaths.vote(parsed.ml, proposalId), auth.idToken, { method: 'DELETE' }),
  );
}
