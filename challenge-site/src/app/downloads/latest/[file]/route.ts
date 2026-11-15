import { SAFE_FILE, latestUrlFor } from '@/lib/edition-pdfs';
import { getEditionPdfs } from '@/lib/edition-pdfs.server';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ file: string }> };

/**
 * /downloads/latest/book.pdf and /downloads/latest/<rail>.pdf: a 302 to the newest published edition's file.
 * Cached one minute (browsers and Cloudflare), so "latest" moves within minutes and no purge is ever needed.
 */
export async function GET(_request: Request, { params }: Ctx) {
  const { file } = await params;
  if (!SAFE_FILE.test(file)) return new Response('Not found', { status: 404 });
  const url = latestUrlFor(await getEditionPdfs(), file);
  if (!url) return new Response('No published edition has this file', { status: 404, headers: { 'Cache-Control': 'public, max-age=60' } });
  return new Response(null, { status: 302, headers: { Location: url, 'Cache-Control': 'public, max-age=60, s-maxage=60' } });
}
