import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { extractDpId } from '@/lib/govhub';
import {
  AskLimitError,
  askDeepi,
  asksToday,
  listReviewAsks,
  MAX_QUESTION,
  reviewAskDailyLimit,
} from '@/lib/review-ask.server';
import { reviewClaudeConfigured } from '@/lib/review-claude.server';
import { resolveWorkgroupMembership } from '@/lib/workgroup-membership.server';
import {
  draftRefFromDocumentHref,
  draftRefFromLabel,
  fetchChapterPassages,
  fetchViewerCoEditor,
  fetchWorkgroupSummary,
} from '@/lib/workgroup-review-govhub';
import { buildWorkgroupReviewQueue } from '@/lib/workgroup-review-queue';

type RouteContext = { params: Promise<{ id: string }> };

/** Members and co-editors of this workgroup only. */
async function viewer(workgroupId: string) {
  const session = await readSession();
  if (!session?.userId) return { error: NextResponse.json({ error: 'Sign in required' }, { status: 401 }) };
  const member = await resolveWorkgroupMembership(workgroupId, session.userId);
  const coEditor = member || !session.idToken ? false : (await fetchViewerCoEditor(workgroupId, session.idToken)).isCoEditor;
  if (!member && !coEditor) {
    return { error: NextResponse.json({ error: 'Join this workgroup to ask Deepi.' }, { status: 403 }) };
  }
  return { session };
}

/** This person's questions and answers on one proposal, and how many questions they have left today. */
export async function GET(request: Request, ctx: RouteContext) {
  const { id: workgroupId } = await ctx.params;
  const v = await viewer(workgroupId);
  if (v.error) return v.error;
  const itemKey = new URL(request.url).searchParams.get('itemKey')?.trim();
  if (!itemKey) return NextResponse.json({ error: 'itemKey required' }, { status: 400 });
  const [asks, used] = await Promise.all([
    listReviewAsks(workgroupId, itemKey, v.session.userId),
    asksToday(v.session.userId),
  ]);
  return NextResponse.json({
    ok: true,
    enabled: reviewClaudeConfigured(),
    asks,
    remainingToday: Math.max(0, reviewAskDailyLimit() - used),
  });
}

/** Ask Deepi (Claude Opus 5.5) about one Review item. The proposal is read from the queue, not the request. */
export async function POST(request: Request, ctx: RouteContext) {
  const { id: workgroupId } = await ctx.params;
  const v = await viewer(workgroupId);
  if (v.error) return v.error;
  if (!reviewClaudeConfigured()) {
    return NextResponse.json({ error: 'Ask Deepi is not configured on this server yet.' }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as { itemKey?: string; question?: string };
  const itemKey = String(body.itemKey || '').trim();
  const question = String(body.question || '').trim();
  if (!itemKey || !question) return NextResponse.json({ error: 'itemKey and question required' }, { status: 400 });
  if (question.length > MAX_QUESTION) {
    return NextResponse.json({ error: `Keep the question under ${MAX_QUESTION} characters.` }, { status: 400 });
  }

  const summary = await fetchWorkgroupSummary(workgroupId, v.session.idToken);
  if (!summary?.id) return NextResponse.json({ error: 'Workgroup not found' }, { status: 404 });
  const dpId = extractDpId(summary.name || '');
  const draftRef = draftRefFromDocumentHref(summary.document_href) || draftRefFromLabel(summary.document_label);
  if (!draftRef) return NextResponse.json({ error: 'This workgroup has no linked chapter' }, { status: 409 });
  const items = await buildWorkgroupReviewQueue({
    workgroupId,
    dpId,
    draftRef,
    documentHref: summary.document_href,
    viewerUserId: v.session.userId,
  });
  const item = items.find((i) => i.key === itemKey);
  if (!item) return NextResponse.json({ error: 'That proposal is no longer on the Review tab.' }, { status: 404 });

  let passages: string[];
  try {
    passages = await fetchChapterPassages(draftRef);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Chapter unavailable' }, { status: 502 });
  }
  try {
    const ask = await askDeepi({
      workgroupId,
      dpId,
      item,
      passages,
      question,
      userId: v.session.userId,
      userName: v.session.displayName || v.session.username || null,
    });
    const used = await asksToday(v.session.userId);
    return NextResponse.json(
      { ok: !ask.error, ask, remainingToday: Math.max(0, reviewAskDailyLimit() - used) },
      { status: ask.error ? 502 : 200 },
    );
  } catch (err) {
    if (err instanceof AskLimitError) return NextResponse.json({ error: err.message, remainingToday: 0 }, { status: 429 });
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Ask failed' }, { status: 500 });
  }
}
