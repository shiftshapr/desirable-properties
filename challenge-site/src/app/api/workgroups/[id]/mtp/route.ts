import { NextResponse } from 'next/server';
import { currentMtpFromPassages, isMtpText, mtpHistory, type MtpResponse } from '@/lib/dp-mtp';
import {
  draftRefForWorkgroup,
  fetchChapterPassages,
  fetchDraftProposalsFresh,
} from '@/lib/workgroup-review-govhub';

type RouteContext = { params: Promise<{ id: string }> };

/** The chapter's current MTP lines and the history of MTP proposals (public, like the chapter). */
export async function GET(_request: Request, ctx: RouteContext) {
  const { id: workgroupId } = await ctx.params;
  const draftRef = workgroupId?.trim() ? await draftRefForWorkgroup(workgroupId) : null;
  if (!draftRef) {
    return NextResponse.json({ error: 'This workgroup has no linked Gov Hub draft' }, { status: 409 });
  }
  try {
    const [passages, proposals] = await Promise.all([
      fetchChapterPassages(draftRef),
      fetchDraftProposalsFresh(draftRef),
    ]);
    const payload: MtpResponse = {
      current: currentMtpFromPassages(passages),
      history: mtpHistory(proposals),
      pendingCount: proposals.filter((p) => isMtpText(p.proposed_text) && String(p.status).toLowerCase() === 'pending').length,
    };
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'MTP unavailable' },
      { status: 502 },
    );
  }
}
