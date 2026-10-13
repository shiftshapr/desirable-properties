import { proxyGovHubJson } from '@/lib/govhub-proxy';

type Ctx = { params: Promise<{ id: string }> };

/** Co-editor seats, rules and what the viewer can do (signed-in or not). */
export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return Response.json({ error: 'workgroup id required' }, { status: 400 });
  }
  return proxyGovHubJson(`/api/workgroups/${encodeURIComponent(id)}/co-editors/`, {
    requireAuth: false,
  });
}
