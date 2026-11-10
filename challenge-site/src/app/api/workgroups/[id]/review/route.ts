import { reviewClaudeConfigured } from '@/lib/review-claude.server';
import { isMtpItem } from '@/lib/dp-mtp';
import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { extractDpId } from '@/lib/govhub';
import { resolveWorkgroupMembership } from '@/lib/workgroup-membership.server';
import {
  draftRefFromDocumentHref,
  draftRefFromLabel,
  fetchViewerCoEditor,
  fetchWorkgroupSummary,
  fetchWorkingRevision,
  workgroupCanEdit,
} from '@/lib/workgroup-review-govhub';
import { buildWorkgroupReviewQueue } from '@/lib/workgroup-review-queue';
import { currentStyleCheckModel } from '@/lib/style-check.server';
import { nudgeReviewChecks } from '@/lib/review-checks-sweep.server';
import type { ReviewQueueResponse, ReviewSteeringInfo } from '@/lib/workgroup-review-types';
import { fetchSteeringDocument } from '@/lib/dp-steering-govhub.server';
import { normalizeSteeringDocument } from '@/lib/dp-steering';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: RouteContext) {
  const { id: workgroupId } = await ctx.params;
  if (!workgroupId?.trim()) {
    return NextResponse.json({ error: 'workgroup id required' }, { status: 400 });
  }

  const session = await readSession();
  const summary = await fetchWorkgroupSummary(workgroupId, session?.idToken);
  if (!summary?.id) {
    return NextResponse.json({ error: 'Workgroup not found' }, { status: 404 });
  }

  const draftRef =
    draftRefFromDocumentHref(summary.document_href) ||
    draftRefFromLabel(summary.document_label);
  const dpId = extractDpId(summary.name || '') ;
  const isMember = session?.userId
    ? await resolveWorkgroupMembership(workgroupId, session.userId)
    : false;
  const coEditor = await fetchViewerCoEditor(workgroupId, session?.idToken || '');
  // After the editorial freeze the steering committee edits and publishes every DP.
  const steeringActs = coEditor.editorialFreeze && coEditor.isSteering;
  const canEdit = steeringActs || (session?.idToken
    ? await workgroupCanEdit(workgroupId, session.idToken)
    : false);

  const queue = await buildWorkgroupReviewQueue({
    workgroupId,
    dpId,
    draftRef,
    documentHref: summary.document_href,
    viewerUserId: session?.userId || null,
  });
  // MTPs withdrawn from Version 1.0 (held for 1.1) are not part of this review (owner, 2026-11-09).
  const items = queue.filter((item) => !(isMtpItem(item) && String(item.status).toLowerCase() === 'withdrawn'));

  // After the freeze, steering members see each proposal's recommendation and steering votes
  // (two of three must agree; docs/DP-V1-STEERING-SWEEP-SPEC.md). Gov Hub's steering API is steering-only.
  let steeringError: string | null = null;
  if (steeringActs && draftRef && session?.idToken) {
    const result = await fetchSteeringDocument(draftRef, session.idToken);
    if (result.ok) {
      const doc = normalizeSteeringDocument(draftRef, result.data, coEditor.govhubUserId);
      const byId = new Map<string, ReviewSteeringInfo>(
        doc.items.map((s) => [
          s.proposalId,
          {
            recommendation: s.analysis?.recommendation || null,
            confidence: s.analysis?.confidence || null,
            stale: s.stale,
            state: s.state,
            votes: s.votes.map((v) => ({ voterName: v.voterName, decision: v.decision, mine: v.mine })),
            outcomeError: s.outcome?.error || null,
          },
        ]),
      );
      for (const item of items) {
        item.steering = item.govhubProposalId ? byId.get(item.govhubProposalId) || null : null;
      }
    } else {
      steeringError = String(result.data.error || `Steering record unavailable (${result.status})`);
    }
  }

  // Checks for new proposals run on the server in the background; this request does not wait.
  if (items.some((item) => item.styleCheckable && !item.styleCheck && !item.styleCheckError)) {
    nudgeReviewChecks({
      id: workgroupId,
      name: summary.name || '',
      document_href: summary.document_href ?? null,
      document_label: summary.document_label ?? null,
    });
  }

  // Members see it too (to email it); only publishers (canEdit) may publish it.
  const workingRevision = draftRef && session?.idToken && (canEdit || isMember)
    ? await fetchWorkingRevision(draftRef, session.idToken).then((w) => (canEdit ? w : { ...w, canPublish: false }))
    : {
        exists: false,
        revisionNumber: null,
        appliedCount: 0,
        unpublished: false,
        canPublish: false,
        publishBlockReason: canEdit
          ? 'Sign in as coordinator to load the working revision.'
          : 'Coordinators promote proposals into a revision draft, then publish that draft later when it should go live.',
      };

  const payload: ReviewQueueResponse = {
    items,
    conflictSets: new Set(items.filter((item) => item.conflictCount > 1).map((item) => item.conflictSetId)).size,
    draftRef,
    workingRevision,
    isMember,
    canEdit,
    isCoEditor: coEditor.isCoEditor,
    viewerGovhubUserId: coEditor.govhubUserId,
    // Gov Hub resolves every signed-in viewer to a user id; none back means it rejected the token.
    signInStale: Boolean(session?.idToken) && !coEditor.govhubUserId,
    styleCheckEnabled: Boolean(currentStyleCheckModel()),
    askEnabled: reviewClaudeConfigured(),
    approvalsNeeded: coEditor.seatsTotal,
    editorialFreeze: coEditor.editorialFreeze,
    isSteering: coEditor.isSteering,
    canSignoffTitles: coEditor.canSignoffTitles,
    steeringHref: steeringActs && draftRef ? `/steering/${encodeURIComponent(draftRef)}` : null,
    steeringError,
  };
  return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
}
