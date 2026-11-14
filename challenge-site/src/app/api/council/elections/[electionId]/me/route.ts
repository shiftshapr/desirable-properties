import { cleanElectionId, councilApiPaths } from '@/lib/council';
import { badRequest, councilProxy } from '@/lib/council.server';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ electionId: string }> };

/** Signed in: what this visitor can do in the election, and their own ballot (theirs only). */
export async function GET(_request: Request, ctx: Ctx) {
  const id = cleanElectionId((await ctx.params).electionId);
  if (!id) return badRequest('Unknown election');
  return councilProxy(councilApiPaths(id).me());
}
