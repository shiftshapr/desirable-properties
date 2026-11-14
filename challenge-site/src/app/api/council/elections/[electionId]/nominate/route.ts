import { cleanElectionId, councilApiPaths } from '@/lib/council';
import { badRequest, councilProxy, readJsonBody } from '@/lib/council.server';

type Ctx = { params: Promise<{ electionId: string }> };

/**
 * Signed in: nominate someone by email. Gov Hub always answers 202 with the same message, whether
 * or not the email has an account, so this never reveals who has one.
 */
export async function POST(request: Request, ctx: Ctx) {
  const id = cleanElectionId((await ctx.params).electionId);
  if (!id) return badRequest('Unknown election');
  const body = await readJsonBody(request);
  const email = String(body.email ?? '').trim();
  if (!email || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return badRequest('Enter a valid email address.');
  }
  const note = String(body.note ?? '').trim();
  return councilProxy(councilApiPaths(id).nominate(), {
    method: 'POST',
    body: { nominee: { email }, ...(note ? { note } : {}) },
  });
}
