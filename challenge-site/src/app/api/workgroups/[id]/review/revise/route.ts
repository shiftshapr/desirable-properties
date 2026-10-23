import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { extractDpId, GOVHUB_PUBLIC_BASE_URL } from '@/lib/govhub';
import { recordWorkgroupActivityEvent } from '@/lib/workgroup-activity-event-store';
import {
  draftRefForWorkgroup,
  fetchViewerCoEditor,
  reviseGovHubProposal,
  type ReviseProposalInput,
} from '@/lib/workgroup-review-govhub';

type RouteContext = { params: Promise<{ id: string }> };

const PATCH_MODES = new Set(['replace', 'insert', 'insert_after']);

/** A co-editor revises a pending proposal's text and/or placement (Gov Hub files the new version). */
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
    return NextResponse.json({ error: "Only this DP's co-editors revise proposals." }, { status: 403 });
  }

  let body: {
    govhubProposalId?: string;
    proposedText?: string;
    originalText?: string;
    patchMode?: string;
    note?: string;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }
  const proposalId = String(body.govhubProposalId || '').trim();
  const proposedText = String(body.proposedText || '').trim();
  const note = String(body.note || '').trim().slice(0, 4000);
  const patchMode = String(body.patchMode || '').trim();
  if (!proposalId || !proposedText) {
    return NextResponse.json({ error: 'govhubProposalId and proposedText required' }, { status: 400 });
  }
  if (!note) {
    return NextResponse.json(
      { error: 'Say what you changed and why. The author reads this note.', code: 'note_required' },
      { status: 400 },
    );
  }
  if (patchMode && !PATCH_MODES.has(patchMode)) {
    return NextResponse.json({ error: 'patchMode must be replace, insert or insert_after' }, { status: 400 });
  }

  const draftRef = await draftRefForWorkgroup(workgroupId, session.idToken);
  if (!draftRef) {
    return NextResponse.json({ error: 'This workgroup has no linked Gov Hub draft' }, { status: 409 });
  }
  const input: ReviseProposalInput = {
    proposedText,
    note,
    originalText: String(body.originalText || '').trim() || undefined,
    patchMode: (patchMode || undefined) as ReviseProposalInput['patchMode'],
  };
  const result = await reviseGovHubProposal(draftRef, proposalId, session.idToken, input);
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
    eventType: 'review_revise',
    actorUserId: session.userId,
    actorName,
    summary: `${actorName} revised a Review proposal and approved the new version (waiting for the other co-editor)`,
    detail: { proposalId, draftRef, href: `/workgroups/${workgroupId}?tab=review` },
  });

  return NextResponse.json({
    ok: true,
    proposal: result.data.proposal || null,
    message:
      String(result.data.message || '') ||
      'Revised and approved by you. It goes in when the other co-editor approves this version.',
  });
}
