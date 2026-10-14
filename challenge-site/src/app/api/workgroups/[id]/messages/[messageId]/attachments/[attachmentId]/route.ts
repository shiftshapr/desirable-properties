import { readSession } from '@/lib/auth-session';
import { getGovHubProxyBaseUrl } from '@/lib/web3auth-config';
import { normalizeWorkgroupMessageParam } from '@/lib/workgroup-message-permalink';

type Ctx = { params: Promise<{ id: string; messageId: string; attachmentId: string }> };

/**
 * Download an email-relay attachment. Gov Hub serves it with the message's visibility,
 * so this forwards the session token when there is one (members) and asks anonymously
 * otherwise (messages in the public teaser); Gov Hub decides. Streams the file back as a
 * download.
 */
export async function GET(_request: Request, ctx: Ctx) {
  const { id, messageId, attachmentId } = await ctx.params;
  const wg = normalizeWorkgroupMessageParam(id);
  const mid = normalizeWorkgroupMessageParam(messageId);
  const aid = normalizeWorkgroupMessageParam(attachmentId);
  if (!wg || !mid || !aid) {
    return Response.json({ error: 'invalid attachment path' }, { status: 400 });
  }

  const session = await readSession();
  const authHeaders: Record<string, string> = session?.idToken
    ? { Authorization: `Bearer ${session.idToken}` }
    : {};

  const url = `${getGovHubProxyBaseUrl()}/api/workgroups/${encodeURIComponent(wg)}/messages/${encodeURIComponent(
    mid,
  )}/attachments/${encodeURIComponent(aid)}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: authHeaders,
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(45000),
    });
  } catch {
    return Response.json({ error: 'Upstream unavailable' }, { status: 502 });
  }

  if (!res.ok || !res.body) {
    const status = res.status >= 300 && res.status < 400 ? 401 : res.status || 502;
    return Response.json({ error: 'Attachment not available' }, { status });
  }

  const upstreamDisposition = res.headers.get('content-disposition') || '';
  const headers = new Headers({
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'Content-Type': res.headers.get('content-type') || 'application/octet-stream',
    // Always a download, never rendered inline on this origin.
    'Content-Disposition': /^attachment\b/i.test(upstreamDisposition)
      ? upstreamDisposition
      : 'attachment',
  });
  const length = res.headers.get('content-length');
  if (length) headers.set('Content-Length', length);
  return new Response(res.body, { status: 200, headers });
}
