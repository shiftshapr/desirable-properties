import { NextResponse } from 'next/server';
import { chapterPassagesWithEdition } from '@/lib/book-editions.server';
import { draftRefForWorkgroup } from '@/lib/workgroup-review-govhub';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * The chapter's Markdown blocks, for a co-editor choosing where a revised proposal goes.
 * Book chapters also carry `edition` and `editionStatus` (docs/EDITIONS.md); `?edition=<id>` asks for that edition's text.
 */
export async function GET(request: Request, ctx: RouteContext) {
  const { id: workgroupId } = await ctx.params;
  const draftRef = workgroupId?.trim() ? await draftRefForWorkgroup(workgroupId) : null;
  if (!draftRef) {
    return NextResponse.json({ error: 'This workgroup has no linked Gov Hub draft' }, { status: 409 });
  }
  const edition = new URL(request.url).searchParams.get('edition')?.trim().slice(0, 20) || null;
  try {
    const result = await chapterPassagesWithEdition(draftRef, edition);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({
      passages: result.passages,
      ...(result.resolution?.ok ? result.resolution.fields : {}),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chapter passages unavailable' },
      { status: 502 },
    );
  }
}
