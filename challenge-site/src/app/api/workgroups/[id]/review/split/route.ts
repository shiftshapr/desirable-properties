import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { extractDpId, GOVHUB_PUBLIC_BASE_URL } from '@/lib/govhub';
import { recordWorkgroupActivityEvent } from '@/lib/workgroup-activity-event-store';
import {
  draftRefForWorkgroup,
  fetchViewerCoEditor,
  splitGovHubProposal,
  type SplitPartInput,
} from '@/lib/workgroup-review-govhub';

type RouteContext = { params: Promise<{ id: string }> };

const PATCH_MODES = new Set(['replace', 'insert', 'insert_after']);
const MAX_PARTS = 6;

/** A co-editor splits a pending proposal into several, each with its own anchor (Gov Hub files them). */
export async function POST(request: Request, ctx: RouteContext) {
  const { id: workgroupId } = await ctx.params;
  if (!workgroupId?.trim()) {
    return NextResponse.json({ error: 'workgroup id required' }, { status: 400 });
  }
  const session = await readSession();
  if (!session?.userId || !session.idToken) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }
  const { isCoEditor } = await fetchViewerCoEditor(workgroupId, session.idToken);
  if (!isCoEditor) {
    return NextResponse.json({ error: "Only this DP's co-editors split proposals." }, { status: 403 });
  }

  let body: {
    govhubProposalId?: string;
    note?: string;
    parts?: Array<{ originalText?: string; proposedText?: string; patchMode?: string }>;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }
  const proposalId = String(body.govhubProposalId || '').trim();
  const note = String(body.note || '').trim().slice(0, 4000);
  if (!proposalId || !Array.isArray(body.parts)) {
    return NextResponse.json({ error: 'govhubProposalId and parts required' }, { status: 400 });
  }
  if (!note) {
    return NextResponse.json(
      { error: 'Say how and why you split it. The author reads this note.', code: 'note_required' },
      { status: 400 },
    );
  }
  if (body.parts.length < 2 || body.parts.length > MAX_PARTS) {
    return NextResponse.json({ error: `A split needs 2 to ${MAX_PARTS} parts.` }, { status: 400 });
  }
  const parts: SplitPartInput[] = [];
  for (const [i, raw] of body.parts.entries()) {
    const originalText = String(raw?.originalText || '').trim();
    const proposedText = String(raw?.proposedText || '').trim();
    const patchMode = String(raw?.patchMode || '').trim();
    if (!originalText || !proposedText || !PATCH_MODES.has(patchMode)) {
      return NextResponse.json(
        { error: `Part ${i + 1} needs a passage, text, and replace, insert above or insert below.` },
        { status: 400 },
      );
    }
    parts.push({ originalText, proposedText, patchMode: patchMode as SplitPartInput['patchMode'] });
  }

  const draftRef = await draftRefForWorkgroup(workgroupId, session.idToken);
  if (!draftRef) {
    return NextResponse.json({ error: 'This workgroup has no linked Gov Hub draft' }, { status: 409 });
  }
  const result = await splitGovHubProposal(draftRef, proposalId, session.idToken, parts, note);
  if (!result.ok) {
    return NextResponse.json({ error: result.error || 'Gov Hub update failed' }, { status: result.status || 502 });
  }

  const actorName = session.displayName || session.username || 'Co-editor';
  const wgRes = await fetch(`${GOVHUB_PUBLIC_BASE_URL}/api/workgroups/${encodeURIComponent(workgroupId)}/`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  const wg = (await wgRes.json().catch(() => ({}))) as { name?: string };
  const dpId = extractDpId(wg.name || '');
  const dpKey = dpId ? `dp${dpId.replace(/^DP/i, '').padStart(2, '0')}` : null;
  await recordWorkgroupActivityEvent({
    workgroupId,
    dpKey,
    eventType: 'review_split',
    actorUserId: session.userId,
    actorName,
    summary: `${actorName} split a Review proposal into ${parts.length} and approved each (waiting for the other co-editor)`,
    detail: { proposalId, draftRef, parts: parts.length, href: `/workgroups/${workgroupId}?tab=review` },
  });

  return NextResponse.json({
    ok: true,
    proposals: result.data.proposals || [],
    message:
      String(result.data.message || '') ||
      `Split into ${parts.length} proposals and approved by you. Each goes in when the other co-editor approves it.`,
  });
}
