import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { extractDpId, GOVHUB_PUBLIC_BASE_URL } from '@/lib/govhub';
import { recordWorkgroupActivityEvent } from '@/lib/workgroup-activity-event-store';
import {
  acceptGovHubProposal,
  declineGovHubProposal,
  draftRefFromDocumentHref,
  draftRefFromLabel,
  workgroupCanEdit,
} from '@/lib/workgroup-review-govhub';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: RouteContext) {
  const { id: workgroupId } = await ctx.params;
  if (!workgroupId?.trim()) {
    return NextResponse.json({ error: 'workgroup id required' }, { status: 400 });
  }

  const session = await readSession();
  if (!session?.userId || !session.idToken) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const canEdit = await workgroupCanEdit(workgroupId, session.idToken);
  if (!canEdit) {
    return NextResponse.json(
      { error: 'Workgroup coordinator or co-lead permission required' },
      { status: 403 },
    );
  }

  let body: { action?: string; govhubProposalId?: string; itemKey?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const rawAction = String(body.action || '').trim().toLowerCase();
  const action = rawAction === 'include' ? 'promote' : rawAction;
  const proposalId = String(body.govhubProposalId || '').trim();
  if ((action !== 'promote' && action !== 'drop') || !proposalId) {
    return NextResponse.json(
      { error: 'action (promote|drop) and govhubProposalId required. Promote composes the revision draft; it does not publish.' },
      { status: 400 },
    );
  }

  const wgRes = await fetch(
    `${GOVHUB_PUBLIC_BASE_URL}/api/workgroups/${encodeURIComponent(workgroupId)}/`,
    {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${session.idToken}`, Accept: 'application/json' },
    },
  );
  const wg = (await wgRes.json().catch(() => ({}))) as {
    name?: string;
    document_href?: string;
    document_label?: string;
  };
  const draftRef =
    draftRefFromDocumentHref(wg.document_href) || draftRefFromLabel(wg.document_label);
  if (!draftRef) {
    return NextResponse.json({ error: 'This workgroup has no linked Gov Hub draft' }, { status: 409 });
  }

  const result =
    action === 'promote'
      ? await acceptGovHubProposal(draftRef, proposalId, session.idToken)
      : await declineGovHubProposal(draftRef, proposalId, session.idToken);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error || 'Gov Hub update failed' },
      { status: result.status || 502 },
    );
  }

  const actorName = session.displayName || session.username || 'Coordinator';
  const dpId = extractDpId(wg.name || '');
  const dpKey = dpId ? `dp${dpId.replace(/^DP/i, '').padStart(2, '0')}` : null;
  await recordWorkgroupActivityEvent({
    workgroupId,
    dpKey,
    eventType: action === 'promote' ? 'review_promote' : 'review_drop',
    actorUserId: session.userId,
    actorName,
    summary:
      action === 'promote'
        ? `${actorName} promoted a Review proposal into the next revision draft (not live)`
        : `${actorName} dropped a Review proposal`,
    detail: { proposalId, draftRef, href: `/workgroups/${workgroupId}?tab=review` },
  });

  return NextResponse.json({
    ok: true,
    action,
    proposal: result.data.proposal || null,
    workingRevision: result.data.working_revision || null,
    published: false,
    message:
      result.data.message ||
      (action === 'promote'
        ? 'Promoted into the next revision draft. Not live until Publish revision.'
        : 'Dropped'),
  });
}
