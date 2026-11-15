import { getEditionPdfs } from '@/lib/edition-pdfs.server';

export const dynamic = 'force-dynamic';

/** The edition PDFs the site offers (Gov Hub's record, cached), for the book viewer on the book host. */
export async function GET() {
  const state = await getEditionPdfs();
  const body = state
    ? { latest: state.latest, editions: state.editions.filter((e) => e.state === 'published') }
    : { latest: null, editions: [] };
  return Response.json(body, {
    headers: { 'Cache-Control': 'public, max-age=120', 'Access-Control-Allow-Origin': '*' },
  });
}
