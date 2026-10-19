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
    : { isCoEditor: false, govhubUserId: null };

  const items = await buildWorkgroupReviewQueue({
    workgroupId,
    dpId,
    draftRef,
    documentHref: summary.document_href,
    viewerUserId: session?.userId || null,
  });

  const workingRevision = draftRef && session?.idToken && canEdit
    ? await fetchWorkingRevision(draftRef, session.idToken)
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
  };
  return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
}
