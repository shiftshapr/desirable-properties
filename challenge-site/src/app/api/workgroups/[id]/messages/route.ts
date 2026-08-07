import { proxyGovHubJson } from '@/lib/govhub-proxy';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return Response.json({ error: 'workgroup id required' }, { status: 400 });
  }
  const url = new URL(request.url);
  return proxyGovHubJson(`/api/workgroups/${encodeURIComponent(id)}/messages/`, {
    requireAuth: false,
    searchParams: url.searchParams,
  });
}

export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return Response.json({ error: 'workgroup id required' }, { status: 400 });
  }
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  return proxyGovHubJson(`/api/workgroups/${encodeURIComponent(id)}/messages/`, {
    requireAuth: true,
    method: 'POST',
    body,
  });
}
