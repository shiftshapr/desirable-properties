import { mlOr400, passThrough, requireSteeringSession, steeringFetch, steeringPaths } from '@/lib/dp-steering-govhub.server';

type RouteContext = { params: Promise<{ ml: string }> };

/** Final stage: sign off this document's current text. */
export async function POST(request: Request, ctx: RouteContext) {
  const parsed = mlOr400((await ctx.params).ml);
  if ('response' in parsed) return parsed.response;
  const auth = await requireSteeringSession();
  if ('response' in auth) return auth.response;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const note = typeof body.note === 'string' ? body.note.slice(0, 4000) : undefined;
  return passThrough(
    await steeringFetch(steeringPaths.signoff(parsed.ml), auth.idToken, { method: 'POST', body: JSON.stringify({ note }) }),
  );
}

/** Withdraw your sign-off. */
export async function DELETE(_request: Request, ctx: RouteContext) {
  const parsed = mlOr400((await ctx.params).ml);
  if ('response' in parsed) return parsed.response;
  const auth = await requireSteeringSession();
  if ('response' in auth) return auth.response;
  return passThrough(await steeringFetch(steeringPaths.signoff(parsed.ml), auth.idToken, { method: 'DELETE' }));
}
