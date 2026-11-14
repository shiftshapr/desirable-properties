import { cleanCandidateId, cleanElectionId, councilApiPaths } from '@/lib/council';
import { badRequest, councilProxy } from '@/lib/council.server';

type Ctx = { params: Promise<{ electionId: string; candidateId: string }> };

/** Signed in candidate: withdraw my candidacy (until voting closes). */
export async function POST(_request: Request, ctx: Ctx) {
  const params = await ctx.params;
  const id = cleanElectionId(params.electionId);
  const cid = cleanCandidateId(params.candidateId);
  if (!id || !cid) return badRequest('Unknown election or candidate');
  return councilProxy(councilApiPaths(id).withdraw(cid), { method: 'POST' });
}
