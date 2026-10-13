import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { extractDpId } from '@/lib/govhub';
import { runStyleCheck } from '@/lib/style-check.server';
import { resolveWorkgroupMembership } from '@/lib/workgroup-membership.server';
import {
  draftRefFromDocumentHref,
  draftRefFromLabel,
  fetchWorkgroupSummary,
} from '@/lib/workgroup-review-govhub';
import { buildWorkgroupReviewQueue, styleCheckInputForItem } from '@/lib/workgroup-review-queue';

type RouteContext = { params: Promise<{ id: string }> };

/** Style-check one Review item (members only). The item text is read from the queue, not the request. */
export async function POST(request: Request, ctx: RouteContext) {
  const { id: workgroupId } = await ctx.params;
  const session = await readSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }
  if (!(await resolveWorkgroupMembership(workgroupId, session.userId))) {
    return NextResponse.json({ error: 'Workgroup membership required' }, { status: 403 });
  }
  const body = (await request.json().catch(() => ({}))) as { itemKey?: string };
  const itemKey = String(body.itemKey || '').trim();
  if (!itemKey) return NextResponse.json({ error: 'itemKey required' }, { status: 400 });

  const summary = await fetchWorkgroupSummary(workgroupId, session.idToken);
  if (!summary?.id) return NextResponse.json({ error: 'Workgroup not found' }, { status: 404 });
  const dpId = extractDpId(summary.name || '');
  const items = await buildWorkgroupReviewQueue({
    workgroupId,
    dpId,
    draftRef: draftRefFromDocumentHref(summary.document_href) || draftRefFromLabel(summary.document_label),
    documentHref: summary.document_href,
    viewerUserId: session.userId,
  });
  const item = items.find((i) => i.key === itemKey);
  const input = item ? styleCheckInputForItem(item, dpId) : null;
  if (!input) {
    return NextResponse.json({ error: 'This item is not a pending patch or insert.' }, { status: 409 });
  }
  try {
    const record = await runStyleCheck({ ...input, workgroupId });
    return NextResponse.json({ ok: true, check: record });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Style check failed' },
      { status: 502 },
    );
  }
}
