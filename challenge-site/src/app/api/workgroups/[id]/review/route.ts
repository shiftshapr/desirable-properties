import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { extractDpId, GOVHUB_PUBLIC_BASE_URL } from '@/lib/govhub';
import { resolveWorkgroupMembership } from '@/lib/workgroup-membership.server';
import {
  draftRefFromDocumentHref,
  draftRefFromLabel,
  fetchWorkingRevision,
  workgroupCanEdit,
} from '@/lib/workgroup-review-govhub';
import { buildWorkgroupReviewQueue } from '@/lib/workgroup-review-queue';
import type { ReviewQueueResponse } from '@/lib/workgroup-review-types';

type RouteContext = { params: Promise<{ id: string }> };

async function fetchWorkgroupSummary(workgroupId: string, idToken?: string | null) {
  const headers: HeadersInit = { Accept: 'application/json' };
  if (idToken) headers.Authorization = `Bearer ${idToken}`;
  const res = await fetch(
    `${GOVHUB_PUBLIC_BASE_URL}/api/workgroups/${encodeURIComponent(workgroupId)}/`,
    { cache: 'no-store', headers },
  );
  if (!res.ok) return null;
  return (await res.json()) as {
    id?: string;
    name?: string;
    slug?: string;
    document_href?: string | null;
    document_label?: string | null;
    can_edit?: boolean;
  };
}

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
  };
  return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
}
