import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { extractDpId } from '@/lib/govhub';
import {
  askCommenter,
  dismissComment,
  draftProposalFromComment,
  fileCommentProposal,
  listReviewComments,
  reopenComment,
} from '@/lib/review-comments.server';
import { resolveWorkgroupMembership } from '@/lib/workgroup-membership.server';
import { draftRefFromDocumentHref, draftRefFromLabel, fetchWorkgroupSummary } from '@/lib/workgroup-review-govhub';

type RouteContext = { params: Promise<{ id: string }> };

async function context(workgroupId: string, idToken?: string | null) {
  const summary = await fetchWorkgroupSummary(workgroupId, idToken);
  if (!summary?.id) return null;
  return {
    dpId: extractDpId(summary.name || ''),
    draftRef: draftRefFromDocumentHref(summary.document_href) || draftRefFromLabel(summary.document_label),
    documentHref: summary.document_href,
  };
}

/** Anchored comments on this DP with their triage status. */
export async function GET(_request: Request, ctx: RouteContext) {
  const { id: workgroupId } = await ctx.params;
  const session = await readSession();
  const c = await context(workgroupId, session?.idToken);
  if (!c) return NextResponse.json({ error: 'Workgroup not found' }, { status: 404 });
  const comments = await listReviewComments({ workgroupId, ...c });
  return NextResponse.json({ comments }, { headers: { 'Cache-Control': 'no-store' } });
}

/** Members act on one comment: draft | file | ask | dismiss | reopen. */
export async function POST(request: Request, ctx: RouteContext) {
  const { id: workgroupId } = await ctx.params;
  const session = await readSession();
  if (!session?.userId || !session.idToken) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }
  if (!(await resolveWorkgroupMembership(workgroupId, session.userId))) {
    return NextResponse.json({ error: 'Workgroup membership required' }, { status: 403 });
  }
  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    commentKey?: string;
    draftId?: string;
    mode?: string;
    proposedText?: string;
    rationale?: string;
    text?: string;
    note?: string;
  };
  const c = await context(workgroupId, session.idToken);
  if (!c) return NextResponse.json({ error: 'Workgroup not found' }, { status: 404 });
  const comment = (await listReviewComments({ workgroupId, ...c })).find((x) => x.key === body.commentKey);
  if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
  const actor = { actorUserId: session.userId, actorName: session.displayName || session.username || 'A member' };

  try {
    switch (body.action) {
      case 'draft': {
        const out = await draftProposalFromComment({ workgroupId, dpId: c.dpId, comment, actorUserId: session.userId });
        return NextResponse.json({ ok: true, ...out });
      }
      case 'file': {
        if (!c.draftRef) return NextResponse.json({ error: 'This workgroup has no linked Gov Hub draft' }, { status: 409 });
        const out = await fileCommentProposal({
          workgroupId,
          draftRef: c.draftRef,
          comment,
          mode: body.mode === 'insert' ? 'insert' : 'replace',
          proposedText: String(body.proposedText || ''),
          rationale: String(body.rationale || ''),
          draftId: body.draftId || null,
          idToken: session.idToken,
          ...actor,
        });
        return NextResponse.json({ ok: true, ...out });
      }
      case 'ask':
        await askCommenter({ workgroupId, draftRef: c.draftRef, comment, text: String(body.text || ''), idToken: session.idToken, ...actor });
        return NextResponse.json({ ok: true });
      case 'dismiss':
        await dismissComment({ workgroupId, comment, note: String(body.note || ''), ...actor });
        return NextResponse.json({ ok: true });
      case 'reopen':
        await reopenComment({ workgroupId, comment, ...actor });
        return NextResponse.json({ ok: true });
      default:
        return NextResponse.json({ error: 'action must be draft, file, ask, dismiss or reopen' }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 502 });
  }
}
