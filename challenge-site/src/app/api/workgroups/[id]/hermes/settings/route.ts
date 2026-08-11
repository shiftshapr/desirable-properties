import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import {
  getWorkgroupHermesSettings,
  isHermesAmbientDbConfigured,
  updateWorkgroupHermesSettings,
} from '@/lib/dp-hermes-ambient-store';
import type { HermesAmbientMode } from '@/lib/hermes-ambient-types';
import { fetchWorkgroupMessagesServer } from '@/lib/workgroup-membership.server';

type RouteCtx = { params: Promise<{ id: string }> };

async function requireMember(workgroupId: string) {
  const session = await readSession();
  if (!session) {
    return { error: NextResponse.json({ error: 'Sign in required' }, { status: 401 }) };
  }

  const data = await fetchWorkgroupMessagesServer(workgroupId, { session, full: true });
  if (!data.is_member) {
    return { error: NextResponse.json({ error: 'Workgroup membership required' }, { status: 403 }) };
  }

  return { session, membership: data };
}

export async function GET(_request: Request, ctx: RouteCtx) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'workgroup id required' }, { status: 400 });
  if (!isHermesAmbientDbConfigured()) {
    return NextResponse.json({ settings: null, configured: false });
  }

  const member = await requireMember(id);
  if ('error' in member) return member.error;

  const settings = await getWorkgroupHermesSettings(id);
  return NextResponse.json({ settings, configured: true });
}

export async function PATCH(request: Request, ctx: RouteCtx) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'workgroup id required' }, { status: 400 });
  if (!isHermesAmbientDbConfigured()) {
    return NextResponse.json({ error: 'Ambient Hermes database not configured' }, { status: 503 });
  }

  const member = await requireMember(id);
  if ('error' in member) return member.error;

  const body = await request.json().catch(() => ({}));
  const allowedModes = Array.isArray(body.allowedModes)
    ? (body.allowedModes as string[]).filter((m): m is HermesAmbientMode =>
        ['observer', 'facilitator', 'devils_advocate'].includes(m),
      )
    : undefined;

  const settings = await updateWorkgroupHermesSettings(
    id,
    {
      confidenceThreshold: body.confidenceThreshold,
      allowedModes,
      cooldownMinutes: body.cooldownMinutes,
      devilsAdvocateMode: body.devilsAdvocateMode,
    },
    member.session.userId,
  );

  return NextResponse.json({ settings });
}
