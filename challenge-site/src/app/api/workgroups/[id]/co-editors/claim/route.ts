import { proxyGovHubJson } from '@/lib/govhub-proxy';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return Response.json({ error: 'workgroup id required' }, { status: 400 });
  }
  const body = (await request.json().catch(() => ({}))) as { statement?: string };
  return proxyGovHubJson(`/api/workgroups/${encodeURIComponent(id)}/co-editors/claim/`, {
    requireAuth: true,
    method: 'POST',
    body: { statement: String(body.statement || '') },
  });
}
