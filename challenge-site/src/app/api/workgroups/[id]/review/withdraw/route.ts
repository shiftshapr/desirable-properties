import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { extractDpId } from '@/lib/govhub';
import { recordWorkgroupActivityEvent } from '@/lib/workgroup-activity-event-store';
import {
  draftRefFromDocumentHref,
  draftRefFromLabel,
  fetchWorkgroupSummary,
  withdrawGovHubProposal,
} from '@/lib/workgroup-review-govhub';

type RouteContext = { params: Promise<{ id: string }> };

/** The author withdraws their own pending proposal. Gov Hub checks that the caller is the author. */
export async function POST(request: Request, ctx: RouteContext) {
  const { id: workgroupId } = await ctx.params;
  if (!workgroupId?.trim()) {
    return NextResponse.json({ error: 'workgroup id required' }, { status: 400 });
  }
  const session = await readSession();
  if (!session?.userId || !session.idToken) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  let body: { govhubProposalId?: string; note?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }
  const proposalId = String(body.govhubProposalId || '').trim();
  const note = String(body.note || '').trim().slice(0, 4000);
  if (!proposalId) {
    return NextResponse.json({ error: 'govhubProposalId required' }, { status: 400 });
  }

  const wg = await fetchWorkgroupSummary(workgroupId, session.idToken);
  const draftRef = draftRefFromDocumentHref(wg?.document_href) || draftRefFromLabel(wg?.document_label);
  if (!draftRef) {
    return NextResponse.json({ error: 'This workgroup has no linked Gov Hub draft' }, { status: 409 });
  }

  const result = await withdrawGovHubProposal(draftRef, proposalId, session.idToken, note);
  if (!result.ok) {
    return NextResponse.json({ error: result.error || 'Gov Hub update failed' }, { status: result.status || 502 });
  }

  const actorName = session.displayName || session.username || 'Author';
  const dpId = extractDpId(wg?.name || '');
  await recordWorkgroupActivityEvent({
    workgroupId,
    dpKey: dpId ? `dp${dpId.replace(/^DP/i, '').padStart(2, '0')}` : null,
    eventType: 'review_withdraw',
    actorUserId: session.userId,
    actorName,
    summary: `${actorName} withdrew their Review proposal`,
    detail: { proposalId, draftRef, href: `/workgroups/${workgroupId}?tab=review` },
  });

  return NextResponse.json({
    ok: true,
    proposal: result.data.proposal || null,
    message: 'Withdrawn. It closes without a co-editor decision.',
  });
}
