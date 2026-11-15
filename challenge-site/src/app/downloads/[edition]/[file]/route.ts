import fs from 'fs';
import { Readable } from 'stream';
import { SAFE_EDITION, SAFE_FILE, downloadName } from '@/lib/edition-pdfs';
import { storedPdf } from '@/lib/edition-pdfs.server';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ edition: string; file: string }> };

/**
 * A published edition PDF, served as the stored file (built once by the backend job, never on request).
 * Immutable: the same URL always answers the same bytes, so browsers and Cloudflare may keep it for a year.
 */
async function serve(request: Request, { params }: Ctx, head: boolean) {
  const { edition, file } = await params;
  if (!SAFE_EDITION.test(edition) || !SAFE_FILE.test(file)) return new Response('Not found', { status: 404 });
  const hit = storedPdf(edition, file);
  if (!hit) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  const stat = fs.statSync(hit.path);
  const etag = hit.sha256 ? `"${hit.sha256}"` : `"${stat.size}-${stat.mtimeMs}"`;
  const headers = new Headers({
    'Content-Type': 'application/pdf',
    'Content-Length': String(stat.size),
    'Cache-Control': 'public, max-age=31536000, immutable',
    ETag: etag,
    'Content-Disposition': `inline; filename="${downloadName(edition, file)}"`,
    'X-Content-Type-Options': 'nosniff',
  });
  if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers });
  if (head) return new Response(null, { status: 200, headers });
  const stream = Readable.toWeb(fs.createReadStream(hit.path)) as unknown as ReadableStream;
  return new Response(stream, { status: 200, headers });
}

export async function GET(request: Request, ctx: Ctx) {
  return serve(request, ctx, false);
}

export async function HEAD(request: Request, ctx: Ctx) {
  return serve(request, ctx, true);
}
