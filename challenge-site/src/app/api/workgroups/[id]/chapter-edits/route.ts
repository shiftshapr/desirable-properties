import { NextResponse } from 'next/server';
import { readAstraChapterBundle } from '@/lib/astra-corpus.server';
import { readSession } from '@/lib/auth-session';
import { GOVHUB_PUBLIC_BASE_URL } from '@/lib/govhub';
import {
  createWorkgroupChapterEdit,
  fetchWorkgroupChapterEdits,
  isWorkgroupChapterEditDbConfigured,
  setWorkgroupChapterEditStatus,
} from '@/lib/workgroup-chapter-edit-store';
import { recordWorkgroupActivityEvent } from '@/lib/workgroup-activity-event-store';
import { resolveWorkgroupMembership } from '@/lib/workgroup-membership.server';

type RouteContext = { params: Promise<{ id: string }> };

async function workgroupCanEdit(
  workgroupId: string,
  idToken: string | null | undefined,
): Promise<boolean> {
  if (!idToken) return false;
  try {
    const res = await fetch(
      `${GOVHUB_PUBLIC_BASE_URL}/api/workgroups/${encodeURIComponent(workgroupId)}/`,
      {
        headers: { Authorization: `Bearer ${idToken}`, Accept: 'application/json' },
        cache: 'no-store',
      },
    );
    if (!res.ok) return false;
    const data = (await res.json()) as { can_edit?: boolean };
    return Boolean(data.can_edit);
  } catch {
    return false;
  }
}

function parseDpKey(raw: string | null): string | null {
  const key = String(raw || '').trim().toLowerCase();
  return /^dp\d{2}$/.test(key) ? key : null;
}

async function loadEditList(workgroupId: string, dpKey: string) {
  const bundle = readAstraChapterBundle(dpKey);
  const baseMarkdown = bundle?.markdown || '';
  return fetchWorkgroupChapterEdits(workgroupId, dpKey, baseMarkdown);
}

export async function GET(request: Request, ctx: RouteContext) {
  const { id: workgroupId } = await ctx.params;
  if (!workgroupId?.trim()) {
    return NextResponse.json({ error: 'workgroup id required' }, { status: 400 });
  }

  const url = new URL(request.url);
  const dpKey = parseDpKey(url.searchParams.get('dpKey'));
  if (!dpKey) {
    return NextResponse.json({ error: 'dpKey required (e.g. dp01)' }, { status: 400 });
  }

  if (!isWorkgroupChapterEditDbConfigured()) {
    const bundle = readAstraChapterBundle(dpKey);
    const baseMarkdown = bundle?.markdown || '';
    return NextResponse.json({
      edits: [],
      effectiveMarkdown: baseMarkdown,
      baseMarkdown,
      hasMemberEdits: false,
    });
  }

  const list = await loadEditList(workgroupId, dpKey);
  return NextResponse.json(list, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request, ctx: RouteContext) {
  const { id: workgroupId } = await ctx.params;
  if (!workgroupId?.trim()) {
    return NextResponse.json({ error: 'workgroup id required' }, { status: 400 });
  }

  const session = await readSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const isMember = await resolveWorkgroupMembership(workgroupId, session.userId);
  if (!isMember) {
    return NextResponse.json({ error: 'Workgroup membership required' }, { status: 403 });
  }

  if (!isWorkgroupChapterEditDbConfigured()) {
    return NextResponse.json({ error: 'Chapter edit storage unavailable' }, { status: 503 });
  }

  let body: {
    dpKey?: string;
    astraReleaseId?: string;
    markdown?: string;
    rationale?: string;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const dpKey = parseDpKey(body.dpKey || null);
  const astraReleaseId = String(body.astraReleaseId || '').trim();
  const markdown = String(body.markdown || '');
  const rationale = String(body.rationale || '').trim();

  if (!dpKey || !astraReleaseId || !markdown.trim()) {
    return NextResponse.json(
      { error: 'dpKey, astraReleaseId, and markdown required' },
      { status: 400 },
    );
  }

  if (markdown.length > 500_000) {
    return NextResponse.json({ error: 'Chapter markdown too large' }, { status: 400 });
  }

  const created = await createWorkgroupChapterEdit({
    workgroupId,
    dpKey,
    astraReleaseId,
    markdown,
    rationale: rationale || null,
    authorUserId: session.userId,
    authorName: session.displayName || session.username || 'Member',
  });

  if (!created) {
    return NextResponse.json({ error: 'Unable to save chapter edit' }, { status: 503 });
  }

  const list = await loadEditList(workgroupId, dpKey);
  return NextResponse.json(list);
}

export async function PATCH(request: Request, ctx: RouteContext) {
  const { id: workgroupId } = await ctx.params;
  if (!workgroupId?.trim()) {
    return NextResponse.json({ error: 'workgroup id required' }, { status: 400 });
  }

  const session = await readSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const canEdit = await workgroupCanEdit(workgroupId, session.idToken);
  if (!canEdit) {
    return NextResponse.json(
      { error: 'Workgroup coordinator or co-lead permission required' },
      { status: 403 },
    );
  }

  if (!isWorkgroupChapterEditDbConfigured()) {
    return NextResponse.json({ error: 'Chapter edit storage unavailable' }, { status: 503 });
  }

  let body: { editId?: string; action?: string; dpKey?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const editId = String(body.editId || '').trim();
  const action = String(body.action || '').trim().toLowerCase();
  const dpKey = parseDpKey(body.dpKey || null);

  if (!editId || !dpKey || (action !== 'revoke' && action !== 'restore')) {
    return NextResponse.json(
      { error: 'editId, dpKey, and action (revoke|restore) required' },
      { status: 400 },
    );
  }

  const ok = await setWorkgroupChapterEditStatus(
    editId,
    workgroupId,
    action === 'revoke' ? 'revoked' : 'active',
    action === 'revoke' ? session.userId : null,
  );

  if (!ok) {
    return NextResponse.json({ error: 'Unable to update chapter edit' }, { status: 503 });
  }

  const actorName = session.displayName || session.username || 'Coordinator';
  if (action === 'restore') {
    await recordWorkgroupActivityEvent({
      workgroupId,
      dpKey,
      eventType: 'member_chapter_edit_restored',
      actorUserId: session.userId,
      actorName,
      summary: `${actorName} restored a member chapter edit on ${dpKey.toUpperCase()}`,
      detail: { editId },
    });
  }

  const list = await loadEditList(workgroupId, dpKey);
  return NextResponse.json(list);
}
