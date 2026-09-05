import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { GOVHUB_PUBLIC_BASE_URL } from '@/lib/govhub';
import {
  fetchAstraRevocations,
  isAstraRevocationDbConfigured,
  restoreAstraChange,
  revokeAstraChange,
} from '@/lib/astra-revocation-store';
import { recordWorkgroupActivityEvent } from '@/lib/workgroup-activity-event-store';

type RouteContext = { params: Promise<{ id: string }> };

function parseChangeIds(raw: string | null): string[] {
  return [...new Set(String(raw || '').split(',').map((id) => id.trim()).filter(Boolean))];
}

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

export async function GET(_request: Request, ctx: RouteContext) {
  const { id: workgroupId } = await ctx.params;
  if (!workgroupId?.trim()) {
    return NextResponse.json({ error: 'workgroup id required' }, { status: 400 });
  }

  const url = new URL(_request.url);
  const changeIds = parseChangeIds(url.searchParams.get('changeIds'));

  if (!isAstraRevocationDbConfigured()) {
    return NextResponse.json({ revoked: {} });
  }

  const snapshot = await fetchAstraRevocations(workgroupId, changeIds);
  return NextResponse.json(snapshot, { headers: { 'Cache-Control': 'no-store' } });
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

  const canEdit = await workgroupCanEdit(workgroupId, session.idToken);
  if (!canEdit) {
    return NextResponse.json(
      { error: 'Workgroup coordinator or co-lead permission required' },
      { status: 403 },
    );
  }

  if (!isAstraRevocationDbConfigured()) {
    return NextResponse.json({ error: 'Revocation storage unavailable' }, { status: 503 });
  }

  let body: { changeId?: string; action?: string } = {};
  try {
    body = (await request.json()) as { changeId?: string; action?: string };
  } catch {
    body = {};
  }

  const changeId = String(body.changeId || '').trim();
  const action = String(body.action || '').trim().toLowerCase();
  if (!changeId || (action !== 'revoke' && action !== 'restore')) {
    return NextResponse.json({ error: 'changeId and action (revoke|restore) required' }, { status: 400 });
  }

  const ok =
    action === 'revoke'
      ? await revokeAstraChange(workgroupId, changeId, session.userId)
      : await restoreAstraChange(workgroupId, changeId);

  if (!ok) {
    return NextResponse.json({ error: 'Unable to update revocation' }, { status: 503 });
  }

  const actorName = session.displayName || session.username || 'Coordinator';
  if (action === 'restore') {
    await recordWorkgroupActivityEvent({
      workgroupId,
      eventType: 'astra_patch_restored',
      actorUserId: session.userId,
      actorName,
      summary: `${actorName} restored Astra patch ${changeId}`,
      detail: { changeId },
    });
  }

  const snapshot = await fetchAstraRevocations(workgroupId, [changeId]);
  return NextResponse.json(snapshot);
}
