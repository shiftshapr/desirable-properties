import { proxyGovHubJson } from '@/lib/govhub-proxy';

type Ctx = { params: Promise<{ id: string }> };

/** Mark this workgroup's chat read up to a message (members only; Gov Hub never moves it back). */
export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return Response.json({ error: 'workgroup id required' }, { status: 400 });
  }
  let body: { message_id?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const messageId = typeof body.message_id === 'string' ? body.message_id.trim() : '';
  if (!messageId) {
    return Response.json({ error: 'message_id required' }, { status: 400 });
  }
  return proxyGovHubJson(`/api/workgroups/${encodeURIComponent(id)}/messages/read`, {
    requireAuth: true,
    method: 'POST',
    body: { message_id: messageId },
  });
}
