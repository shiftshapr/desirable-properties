import { fetchWorkgroupMessagesServer } from '@/lib/workgroup-messages.server';
import { proxyGovHubJson } from '@/lib/govhub-proxy';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return Response.json({ error: 'workgroup id required' }, { status: 400 });
  }

  const url = new URL(request.url);
  const fullParam = url.searchParams.get('full')?.toLowerCase() ?? '';
  const full = fullParam === '1' || fullParam === 'true' || fullParam === 'yes';

  const payload = await fetchWorkgroupMessagesServer(id, { full });
  return Response.json(payload, {
    headers: { 'Cache-Control': 'no-store' },
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
