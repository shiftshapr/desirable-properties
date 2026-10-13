import { proxyGovHubJson } from '@/lib/govhub-proxy';

type Ctx = { params: Promise<{ id: string; seatId: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const { id, seatId } = await ctx.params;
  if (!id?.trim() || !seatId?.trim()) {
    return Response.json({ error: 'workgroup id and seat id required' }, { status: 400 });
  }
  const body = (await request.json().catch(() => ({}))) as { reason?: string };
  return proxyGovHubJson(
    `/api/workgroups/${encodeURIComponent(id)}/co-editors/${encodeURIComponent(seatId)}/revoke/`,
    { requireAuth: true, method: 'POST', body: { reason: String(body.reason || '') } },
  );
}
