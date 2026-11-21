import { NextResponse } from 'next/server';
import { handleCommunityGet } from '@/lib/pads/pad-community-core';
import { padCommunityDeps } from '@/lib/pads/pad-store.server';

/** A proposal pad's community layer: Support / Concern counts and reasons, the viewer's own stance, and Follow. */
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const r = await handleCommunityGet(padCommunityDeps, id, new URL(request.url).searchParams.get('ml'));
  return NextResponse.json(r.body, { status: r.status, headers: { 'Cache-Control': 'no-store' } });
}
