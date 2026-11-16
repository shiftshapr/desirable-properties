import { handleAction } from '@/lib/listening/actions.server';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ slug: string }> };

/** Every workspace write (contribution, card, moderation, correction decision, phase, role). */
export async function POST(request: Request, ctx: RouteContext) {
  const { slug } = await ctx.params;
  return handleAction(request, slug);
}
