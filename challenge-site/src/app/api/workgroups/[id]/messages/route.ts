import { fetchWorkgroupMessagesServer } from '@/lib/workgroup-membership.server';
import { proxyGovHubJson } from '@/lib/govhub-proxy';
import { normalizeWorkgroupMessageParam } from '@/lib/workgroup-message-permalink';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return Response.json({ error: 'workgroup id required' }, { status: 400 });
  }

  const url = new URL(request.url);
  const fullParam = url.searchParams.get('full')?.toLowerCase() ?? '';
  const full = fullParam === '1' || fullParam === 'true' || fullParam === 'yes';

  const before = normalizeWorkgroupMessageParam(url.searchParams.get('before'));

  const payload = await fetchWorkgroupMessagesServer(id, { full, before });
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
