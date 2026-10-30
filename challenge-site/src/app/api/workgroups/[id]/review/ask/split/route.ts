import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { extractDpId } from '@/lib/govhub';
import { AskLimitError, asksToday, draftSplit, reviewAskDailyLimit } from '@/lib/review-ask.server';
import { reviewClaudeConfigured } from '@/lib/review-claude.server';
import {
  draftRefFromDocumentHref,
  draftRefFromLabel,
  fetchChapterPassages,
  fetchViewerCoEditor,
  fetchWorkgroupSummary,
} from '@/lib/workgroup-review-govhub';
import { buildWorkgroupReviewQueue } from '@/lib/workgroup-review-queue';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Deepi drafts a split of one pending proposal into several with their own anchors, for a co-editor
 * to check and post (../../split). Nothing is filed here.
 */
export async function POST(request: Request, ctx: RouteContext) {
  const { id: workgroupId } = await ctx.params;
  const session = await readSession();
  if (!session?.userId || !session.idToken) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }
  if (!(await fetchViewerCoEditor(workgroupId, session.idToken)).isCoEditor) {
    return NextResponse.json({ error: "Only this DP's co-editors split proposals." }, { status: 403 });
  }
  if (!reviewClaudeConfigured()) {
    return NextResponse.json({ error: 'Ask Deepi is not configured on this server yet.' }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as { itemKey?: string };
  const itemKey = String(body.itemKey || '').trim();
  if (!itemKey) return NextResponse.json({ error: 'itemKey required' }, { status: 400 });

  const summary = await fetchWorkgroupSummary(workgroupId, session.idToken);
  if (!summary?.id) return NextResponse.json({ error: 'Workgroup not found' }, { status: 404 });
  const dpId = extractDpId(summary.name || '');
  const draftRef = draftRefFromDocumentHref(summary.document_href) || draftRefFromLabel(summary.document_label);
  if (!draftRef) return NextResponse.json({ error: 'This workgroup has no linked chapter' }, { status: 409 });
  const items = await buildWorkgroupReviewQueue({
    workgroupId,
    dpId,
    draftRef,
    documentHref: summary.document_href,
    viewerUserId: session.userId,
  });
  const item = items.find((i) => i.key === itemKey);
  if (!item?.govhubProposalId || item.status !== 'pending' || item.patchMode === 'bundle' || item.patchMode === 'dedup') {
    return NextResponse.json({ error: 'Only a pending patch or insert can be split.' }, { status: 409 });
  }

  try {
    const passages = await fetchChapterPassages(draftRef);
    const draft = await draftSplit({
      workgroupId,
      dpId,
      item,
      passages,
      userId: session.userId,
      userName: session.displayName || session.username || null,
    });
    const used = await asksToday(session.userId);
    return NextResponse.json({ ok: true, draft, remainingToday: Math.max(0, reviewAskDailyLimit() - used) });
  } catch (err) {
    if (err instanceof AskLimitError) return NextResponse.json({ error: err.message, remainingToday: 0 }, { status: 429 });
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Draft failed' }, { status: 502 });
  }
}
