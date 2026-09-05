import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import {
  ASTRA_APPLAUSE_MAX_PER_USER,
  fetchAstraApplause,
  incrementAstraApplause,
  isAstraApplauseDbConfigured,
} from '@/lib/astra-applause-store';
import { resolveWorkgroupRouteId } from '@/lib/workgroup-route-id.server';

type RouteContext = { params: Promise<{ id: string }> };

function parseChangeIds(raw: string | null): string[] {
  return [...new Set(String(raw || '').split(',').map((id) => id.trim()).filter(Boolean))];
}

export async function GET(request: Request, ctx: RouteContext) {
  const { id: rawWorkgroupId } = await ctx.params;
  if (!rawWorkgroupId?.trim()) {
    return NextResponse.json({ error: 'workgroup id required' }, { status: 400 });
  }

  const url = new URL(request.url);
  const changeIds = parseChangeIds(url.searchParams.get('changeIds'));
  if (!changeIds.length) {
    return NextResponse.json({ error: 'changeIds required' }, { status: 400 });
  }

  if (!isAstraApplauseDbConfigured()) {
    const empty = Object.fromEntries(changeIds.map((changeId) => [changeId, 0]));
    return NextResponse.json({ totals: empty, mine: empty });
  }

  const workgroupId = (await resolveWorkgroupRouteId(rawWorkgroupId)) || rawWorkgroupId.trim();
  const session = await readSession();
  const snapshot = await fetchAstraApplause(workgroupId, changeIds, session?.userId ?? null);
  return NextResponse.json(snapshot, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request, ctx: RouteContext) {
  const { id: rawWorkgroupId } = await ctx.params;
  if (!rawWorkgroupId?.trim()) {
    return NextResponse.json({ error: 'workgroup id required' }, { status: 400 });
  }

  const session = await readSession();
  if (!session?.userId) {
    return NextResponse.json(
      {
        error: 'Sign in required to applaud Astra changes',
        hint: 'Applause totals are public; giving applause requires a Gov Hub session.',
      },
      { status: 401 },
    );
  }

  if (!isAstraApplauseDbConfigured()) {
    return NextResponse.json({ error: 'Applause storage unavailable' }, { status: 503 });
  }

  let body: { changeId?: string } = {};
  try {
    body = (await request.json()) as { changeId?: string };
  } catch {
    body = {};
  }

  const changeId = String(body.changeId || '').trim();
  if (!changeId) {
    return NextResponse.json({ error: 'changeId required' }, { status: 400 });
  }

  const workgroupId = (await resolveWorkgroupRouteId(rawWorkgroupId)) || rawWorkgroupId.trim();
  const result = await incrementAstraApplause(workgroupId, changeId, session.userId);
  if (!result.ok) {
    if (result.reason === 'cap_reached') {
      return NextResponse.json(
        {
          ok: false,
          reason: 'cap_reached',
          total: result.total ?? 0,
          mine: result.mine ?? ASTRA_APPLAUSE_MAX_PER_USER,
          error: `You can applaud each change up to ${ASTRA_APPLAUSE_MAX_PER_USER} times`,
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: 'Unable to record applause' }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    total: result.total,
    mine: result.mine,
  });
}
