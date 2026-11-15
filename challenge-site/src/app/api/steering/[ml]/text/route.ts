import { chapterPassagesWithEdition } from '@/lib/book-editions.server';

type Ctx = { params: Promise<{ ml: string }> };

/**
 * A document's current text as Gov Hub holds it (every accepted change applied): the text a sign-off is tied to.
 * Book chapters also carry `edition` and `editionStatus` (docs/EDITIONS.md); `?edition=<id>` asks for that edition's text.
 */
export async function GET(request: Request, { params }: Ctx) {
  const { ml } = await params;
  const ref = ml.replace(/[^A-Za-z0-9-]/g, '').slice(0, 40);
  const edition = new URL(request.url).searchParams.get('edition')?.trim().slice(0, 20) || null;
  try {
    const result = await chapterPassagesWithEdition(ref, edition);
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
    const { passages, resolution } = result;
    return Response.json({
      ml: ref,
      markdown: passages.join('\n\n'),
      passages: passages.length,
      ...(resolution?.ok ? resolution.fields : {}),
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Text unavailable' }, { status: 502 });
  }
}
