import { SAFE_FILE, latestUrlFor } from '@/lib/edition-pdfs';
import { getEditionPdfs } from '@/lib/edition-pdfs.server';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ file: string }> };

/**
 * /downloads/latest/book.pdf and /downloads/latest/<rail>.pdf: a 302 to the newest published edition's file.
 * Browsers keep it one minute and Cloudflare does not keep it (private), so "latest" moves within a minute; no purge.
 */
export async function GET(_request: Request, { params }: Ctx) {
  const { file } = await params;
  if (!SAFE_FILE.test(file)) return new Response('Not found', { status: 404 });
  const url = latestUrlFor(await getEditionPdfs(), file);
  if (!url) return new Response('No published edition has this file', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  // private: Cloudflare's Browser Cache TTL (4 h) overrides a short public max-age; it leaves private alone.
  return new Response(null, { status: 302, headers: { Location: url, 'Cache-Control': 'private, max-age=60' } });
}
