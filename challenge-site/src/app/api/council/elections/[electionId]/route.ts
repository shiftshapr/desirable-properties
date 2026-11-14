import { cleanElectionId, councilApiPaths } from '@/lib/council';
import { badRequest, councilProxy } from '@/lib/council.server';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ electionId: string }> };

/** Public: one election (no running tallies; results only once published). */
export async function GET(_request: Request, ctx: Ctx) {
  const id = cleanElectionId((await ctx.params).electionId);
  if (!id) return badRequest('Unknown election');
  return councilProxy(councilApiPaths(id).election(), { requireAuth: false });
}
