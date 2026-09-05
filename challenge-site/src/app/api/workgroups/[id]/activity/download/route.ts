import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { recordWorkgroupActivityEvent } from '@/lib/workgroup-activity-event-store';
import { resolveWorkgroupRouteId } from '@/lib/workgroup-route-id.server';

type RouteContext = { params: Promise<{ id: string }> };

function parseDpKey(raw: string | null | undefined): string | null {
  const key = String(raw || '').trim().toLowerCase();
  return /^dp\d{2}$/.test(key) ? key : null;
}

export async function POST(request: Request, ctx: RouteContext) {
  const { id: rawWorkgroupId } = await ctx.params;
  if (!rawWorkgroupId?.trim()) {
    return NextResponse.json({ error: 'workgroup id required' }, { status: 400 });
  }

  const workgroupId = (await resolveWorkgroupRouteId(rawWorkgroupId)) || rawWorkgroupId.trim();

  let body: {
    dpKey?: string;
    resourceType?: string;
    resourceLabel?: string;
    resourceHref?: string;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const resourceLabel = String(body.resourceLabel || '').trim();
  const resourceHref = String(body.resourceHref || '').trim();
  const resourceType = String(body.resourceType || 'download').trim();
  if (!resourceLabel) {
    return NextResponse.json({ error: 'resourceLabel required' }, { status: 400 });
  }

  const session = await readSession();
  const actorName = session?.displayName || session?.username || 'Visitor';
  const summary = session?.userId
    ? `${actorName} downloaded ${resourceLabel}`
    : `Someone downloaded ${resourceLabel}`;

  const event = await recordWorkgroupActivityEvent({
    workgroupId,
    dpKey: parseDpKey(body.dpKey),
    eventType: 'download',
    actorUserId: session?.userId ?? null,
    actorName: session?.userId ? actorName : null,
    summary,
    detail: { resourceType, resourceLabel, resourceHref },
  });

  if (!event) {
    return NextResponse.json({ error: 'Unable to record download' }, { status: 503 });
  }

  return NextResponse.json({ ok: true, id: event.id });
}
