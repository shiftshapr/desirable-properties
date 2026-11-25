import { handleProposalsGet, handleProposalsPost } from '@/lib/next-proposals/core';
import { proposalDeps } from '@/lib/next-proposals/store.server';

/** Proposals for a community session's agenda (see src/lib/next-proposals/core.ts). Date: YYYY-MM-DD. */
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ date: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { date } = await ctx.params;
  return handleProposalsGet(date, proposalDeps);
}

export async function POST(request: Request, ctx: Ctx) {
  const { date } = await ctx.params;
  return handleProposalsPost(request, date, proposalDeps);
}
