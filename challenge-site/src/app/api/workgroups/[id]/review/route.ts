import { reviewClaudeConfigured } from '@/lib/review-claude.server';
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
import type { ReviewQueueResponse } from '@/lib/workgroup-review-types';

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
  const canEdit = session?.idToken
    ? await workgroupCanEdit(workgroupId, session.idToken)
    : false;

  const coEditor = session?.idToken
    ? await fetchViewerCoEditor(workgroupId, session.idToken)
    : await fetchViewerCoEditor(workgroupId, '').catch(() => ({ isCoEditor: false, govhubUserId: null, seatsTotal: 2 }));

  const items = await buildWorkgroupReviewQueue({
    workgroupId,
    dpId,
    draftRef,
    documentHref: summary.document_href,
    viewerUserId: session?.userId || null,
  });

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
    styleCheckEnabled: Boolean(currentStyleCheckModel()),
    askEnabled: reviewClaudeConfigured(),
    approvalsNeeded: coEditor.seatsTotal,
  };
  return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
}
