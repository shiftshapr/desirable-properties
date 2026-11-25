import { handleScreeningGet, handleScreeningPost } from '@/lib/screening/screening-core';
import { activeScreeningDeps } from '@/lib/screening/screening-store.server';

/**
 * Council screening of a session's draft ballot (see screening-core.ts). GET: public objections per question and the
 * viewer's role. POST: a council member objects to a question (reason required) or withdraws their own objection.
 */
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  return handleScreeningGet(slug, await activeScreeningDeps());
}

export async function POST(request: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  return handleScreeningPost(request, slug, await activeScreeningDeps());
}
