import { fetchChapterPassages } from '@/lib/workgroup-review-govhub';

type Ctx = { params: Promise<{ ml: string }> };

/** A document's current text as Gov Hub holds it (every accepted change applied): the text a sign-off is tied to. */
export async function GET(_request: Request, { params }: Ctx) {
  const { ml } = await params;
  const ref = ml.replace(/[^A-Za-z0-9-]/g, '').slice(0, 40);
  try {
    const passages = await fetchChapterPassages(ref);
    return Response.json({ ml: ref, markdown: passages.join('\n\n'), passages: passages.length });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Text unavailable' }, { status: 502 });
  }
}
