import { cleanElectionId, councilApiPaths } from '@/lib/council';
import { badRequest, councilProxy, readJsonBody } from '@/lib/council.server';

type Ctx = { params: Promise<{ electionId: string }> };

/** Signed in: stand for the council with a statement (nominations phase). */
export async function POST(request: Request, ctx: Ctx) {
  const id = cleanElectionId((await ctx.params).electionId);
  if (!id) return badRequest('Unknown election');
  const body = await readJsonBody(request);
  return councilProxy(councilApiPaths(id).apply(), {
    method: 'POST',
    body: { statement_md: String(body.statement_md ?? '') },
  });
}
