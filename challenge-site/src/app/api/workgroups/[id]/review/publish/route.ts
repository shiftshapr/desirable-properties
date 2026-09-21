import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { extractDpId, GOVHUB_PUBLIC_BASE_URL } from '@/lib/govhub';
import { recordWorkgroupActivityEvent } from '@/lib/workgroup-activity-event-store';
import {
  draftRefFromDocumentHref,
  draftRefFromLabel,
  publishWorkingRevision,
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

  let body: { whatChanged?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
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

  const result = await publishWorkingRevision(draftRef, session.idToken, body.whatChanged);
  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error || 'Publish failed',
        error_code: result.data.error_code || null,
      },
      { status: result.status || 502 },
    );
  }

  const published = (result.data.published || {}) as { revision_number?: string };
  const actorName = session.displayName || session.username || 'Coordinator';
  await recordWorkgroupActivityEvent({
    workgroupId,
    dpKey: (() => {
      const dpId = extractDpId(wg.name || '');
      return dpId ? `dp${dpId.replace(/^DP/i, '').padStart(2, '0')}` : null;
    })(),
    eventType: 'review_publish',
    actorUserId: session.userId,
    actorName,
    summary: `${actorName} published Gov Hub revision ${published.revision_number || ''}`.trim(),
    detail: { draftRef, revision: published.revision_number || null },
  });

  return NextResponse.json({
    ok: true,
    published: true,
    revision: published,
    message: result.data.message || 'Revision is now the live Gov Hub / book text',
  });
}
