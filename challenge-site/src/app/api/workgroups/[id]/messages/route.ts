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

/** Gov Hub accepts 16 MB per request (three files of up to 10 MB, 15 MB in total). */
const MAX_UPLOAD_REQUEST_BYTES = 16 * 1024 * 1024;

export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!id?.trim()) {
    return Response.json({ error: 'workgroup id required' }, { status: 400 });
  }
  const path = `/api/workgroups/${encodeURIComponent(id)}/messages/`;
  if ((request.headers.get('content-type') || '').toLowerCase().startsWith('multipart/form-data')) {
    // A post with attachments: Gov Hub checks types, sizes and membership.
    const length = Number(request.headers.get('content-length') || 0);
    if (length > MAX_UPLOAD_REQUEST_BYTES) {
      return Response.json({ error: 'Files total more than 15 MB' }, { status: 413 });
    }
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return Response.json({ error: 'Could not read the upload' }, { status: 400 });
    }
    const out = new FormData();
    out.set('body', String(form.get('body') ?? ''));
    for (const file of form.getAll('files')) {
      if (file instanceof File) out.append('files', file, file.name);
    }
    return proxyGovHubJson(path, { requireAuth: true, method: 'POST', formData: out, timeoutMs: 90000 });
  }
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  return proxyGovHubJson(path, {
    requireAuth: true,
    method: 'POST',
    body,
  });
}
