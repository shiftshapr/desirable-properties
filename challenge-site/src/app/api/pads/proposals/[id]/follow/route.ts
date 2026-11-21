import { NextResponse } from 'next/server';
import { handleFollowPost } from '@/lib/pads/pad-community-core';
import { padCommunityDeps } from '@/lib/pads/pad-store.server';

/** Follow ({follow: true}) or unfollow ({follow: false}) a proposal pad: an email when its status changes. */
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const r = await handleFollowPost(padCommunityDeps, id, body, new URL(request.url).searchParams.get('ml'));
  return NextResponse.json(r.body, { status: r.status });
}
