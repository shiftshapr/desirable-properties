import { cleanElectionId, councilApiPaths } from '@/lib/council';
import { badRequest, councilProxy, readJsonBody } from '@/lib/council.server';

type Ctx = { params: Promise<{ electionId: string }> };

/** Signed in: cast or change an approval ballot (voting phase). Re-posting replaces the earlier ballot. */
export async function POST(request: Request, ctx: Ctx) {
  const id = cleanElectionId((await ctx.params).electionId);
  if (!id) return badRequest('Unknown election');
  const body = await readJsonBody(request);
  const choices = Array.isArray(body.choices) ? body.choices.map((c) => String(c)).slice(0, 200) : [];
  return councilProxy(councilApiPaths(id).ballot(), { method: 'POST', body: { choices } });
}

/** Signed in: withdraw my ballot while voting is open. */
export async function DELETE(_request: Request, ctx: Ctx) {
  const id = cleanElectionId((await ctx.params).electionId);
  if (!id) return badRequest('Unknown election');
  return councilProxy(councilApiPaths(id).ballot(), { method: 'DELETE' });
}
