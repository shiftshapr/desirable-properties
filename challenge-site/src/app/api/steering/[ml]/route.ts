import {
  fetchSteeringDocument,
  mlOr400,
  passThrough,
  requireSteeringSession,
} from '@/lib/dp-steering-govhub.server';

type RouteContext = { params: Promise<{ ml: string }> };

/** One document's open proposals with their analyses, votes and batches (Gov Hub, steering only). */
export async function GET(_request: Request, ctx: RouteContext) {
  const parsed = mlOr400((await ctx.params).ml);
  if ('response' in parsed) return parsed.response;
  const auth = await requireSteeringSession();
  if ('response' in auth) return auth.response;
  return passThrough(await fetchSteeringDocument(parsed.ml, auth.idToken));
}
