import { handleBallotGet, handleBallotPost } from '@/lib/ballots/ballot-core';
import { activeBallotDeps } from '@/lib/ballots/ballot-store.server';

/** Session ballot for one occurrence (see ballot-core.ts). GET: status, own votes, counts once published. POST: vote. */
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  return handleBallotGet(slug, activeBallotDeps());
}

export async function POST(request: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  return handleBallotPost(request, slug, activeBallotDeps());
}
