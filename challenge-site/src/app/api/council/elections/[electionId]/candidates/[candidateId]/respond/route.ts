import { cleanCandidateId, cleanElectionId, councilApiPaths } from '@/lib/council';
import { badRequest, councilProxy, readJsonBody } from '@/lib/council.server';

type Ctx = { params: Promise<{ electionId: string; candidateId: string }> };

/** Signed in nominee: accept (with a statement) or decline a nomination. */
export async function POST(request: Request, ctx: Ctx) {
  const params = await ctx.params;
  const id = cleanElectionId(params.electionId);
  const cid = cleanCandidateId(params.candidateId);
  if (!id || !cid) return badRequest('Unknown election or candidate');
  const body = await readJsonBody(request);
  if (typeof body.accept !== 'boolean') return badRequest('Choose accept or decline.');
  return councilProxy(councilApiPaths(id).respond(cid), {
    method: 'POST',
    body: {
      accept: body.accept,
      ...(body.accept ? { statement_md: String(body.statement_md ?? '') } : {}),
    },
  });
}
