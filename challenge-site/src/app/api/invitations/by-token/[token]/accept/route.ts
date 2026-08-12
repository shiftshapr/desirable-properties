import { proxyGovHubJson } from '@/lib/govhub-proxy';

type Ctx = { params: Promise<{ token: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  if (!token?.trim()) {
    return Response.json({ error: 'token required' }, { status: 400 });
  }
  return proxyGovHubJson(`/api/invitations/by-token/${encodeURIComponent(token)}/accept/`, {
    requireAuth: true,
    method: 'POST',
    body: {},
  });
}
