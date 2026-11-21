import { NextResponse } from 'next/server';
import { handleAdvisoryPost } from '@/lib/pads/pad-community-core';
import { padCommunityDeps } from '@/lib/pads/pad-store.server';

/** Set, change or clear the viewer's advisory Support / Concern on a proposal (pad-community-core.ts). */
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const r = await handleAdvisoryPost(padCommunityDeps, id, body, new URL(request.url).searchParams.get('ml'));
  return NextResponse.json(r.body, { status: r.status });
}
