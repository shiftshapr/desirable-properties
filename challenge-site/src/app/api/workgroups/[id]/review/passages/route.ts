import { NextResponse } from 'next/server';
import { draftRefForWorkgroup, fetchChapterPassages } from '@/lib/workgroup-review-govhub';

type RouteContext = { params: Promise<{ id: string }> };

/** The chapter's Markdown blocks, for a co-editor choosing where a revised proposal goes. */
export async function GET(_request: Request, ctx: RouteContext) {
  const { id: workgroupId } = await ctx.params;
  const draftRef = workgroupId?.trim() ? await draftRefForWorkgroup(workgroupId) : null;
  if (!draftRef) {
    return NextResponse.json({ error: 'This workgroup has no linked Gov Hub draft' }, { status: 409 });
  }
  try {
    return NextResponse.json({ passages: await fetchChapterPassages(draftRef) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chapter passages unavailable' },
      { status: 502 },
    );
  }
}
