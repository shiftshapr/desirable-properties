import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { extractDpId, GOVHUB_PUBLIC_BASE_URL } from '@/lib/govhub';
import { recordWorkgroupActivityEvent } from '@/lib/workgroup-activity-event-store';
import {
  acceptGovHubProposal,
  declineGovHubProposal,
  draftRefFromDocumentHref,
  draftRefFromLabel,
  fetchViewerCoEditor,
} from '@/lib/workgroup-review-govhub';
import { postSteeringVote } from '@/lib/dp-steering-govhub.server';

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

  // Only this DP's co-editors approve or decline (owner, 2026-10-19).
  const { isCoEditor, isSteering, govhubUserId, canSignoffTitles, editorialFreeze } = await fetchViewerCoEditor(
    workgroupId,
    session.idToken,
  );
  if (!govhubUserId) {
    // Gov Hub did not accept the sign-in (usually an expired token), so it cannot tell who this is.
    return NextResponse.json(
      { error: 'Your sign-in has expired. Sign in again to approve or decline.', code: 'sign_in_again' },
      { status: 401 },
    );
  }
  let body: { action?: string; govhubProposalId?: string; itemKey?: string; note?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const rawAction = String(body.action || '').trim().toLowerCase();
  const action = rawAction === 'include' ? 'promote' : rawAction;
  // Co-editors decide; a steering member (or site admin) may also agree to a title change, which
  // Gov Hub accepts only for proposals that change the chapter title. Steering members also decide
  // MTPs (held for Version 1.1); Gov Hub refuses them anything else before the freeze.
  if (!isCoEditor && !isSteering && !(canSignoffTitles && action === 'promote')) {
    return NextResponse.json(
      { error: "Only this DP's co-editors approve or decline proposals." },
      { status: 403 },
    );
  }
  const proposalId = String(body.govhubProposalId || '').trim();
  const note = String(body.note || '').trim().slice(0, 4000);
  if ((action !== 'promote' && action !== 'drop') || !proposalId) {
    return NextResponse.json(
      { error: 'action (promote|drop) and govhubProposalId required. Promote composes the revision draft; it does not publish.' },
      { status: 400 },
    );
  }
  if (action === 'drop' && !note) {
    return NextResponse.json(
      { error: 'Write a decision note before declining. The author can read it.', code: 'note_required' },
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

  // After the freeze, Approve and Decline record a steering vote; Gov Hub carries the outcome out
  // once two steering members agree (docs/DP-V1-STEERING-SWEEP-SPEC.md, rule 7). This covers
  // MTPs and title changes too.
  if (editorialFreeze && isSteering) {
    const decision = action === 'promote' ? 'accept' : 'decline';
    const vote = await postSteeringVote(draftRef, session.idToken, {
      proposal_id: proposalId,
      decision,
      ...(note ? { note } : {}),
    });
    if (!vote.ok) {
      return NextResponse.json(
        { error: String(vote.data.error || vote.data.detail || `Steering vote failed (${vote.status})`) },
        { status: vote.status || 502 },
      );
    }
    const state = String(vote.data.state || '');
    const outcome = (vote.data.outcome || null) as { error?: string | null } | null;
    const actor = session.displayName || session.username || 'Steering member';
    const steeringDpId = extractDpId(wg.name || '');
    await recordWorkgroupActivityEvent({
      workgroupId,
      dpKey: steeringDpId ? `dp${steeringDpId.replace(/^DP/i, '').padStart(2, '0')}` : null,
      eventType: action === 'promote' ? 'review_promote' : 'review_drop',
      actorUserId: session.userId,
      actorName: actor,
      summary: `${actor} voted to ${decision === 'accept' ? 'accept' : 'reject'} a Review proposal (steering)`,
      detail: { proposalId, draftRef, steering: true, state, href: `/workgroups/${workgroupId}?tab=review` },
    });
    return NextResponse.json({
      ok: true,
      action,
      steering: true,
      state,
      published: false,
      message: outcome?.error
        ? `Vote recorded. Two steering members agree, but carrying it out failed: ${outcome.error}`
        : outcome || state === 'done'
          ? `Vote recorded. Two steering members agree, so the proposal is ${decision === 'accept' ? 'accepted into the revision draft (not live)' : 'declined'}.`
          : state === 'split'
            ? 'Vote recorded. The steering votes differ, so the third member’s vote settles it.'
            : 'Vote recorded. It is carried out when a second steering member agrees.',
    });
  }

  const result =
    action === 'promote'
      ? await acceptGovHubProposal(draftRef, proposalId, session.idToken, note)
      : await declineGovHubProposal(draftRef, proposalId, session.idToken, note);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error || 'Gov Hub update failed' },
      { status: result.status || 502 },
    );
  }

  const actorName = session.displayName || session.username || 'Co-editor';
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
        ? result.data.incorporated === false
          ? `${actorName} approved a Review proposal as co-editor (waiting for the second co-editor)`
          : `${actorName} promoted a Review proposal into the next revision draft (not live)`
        : `${actorName} declined a Review proposal`,
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
        : 'Declined'),
  });
}
