import { NextResponse } from 'next/server';
import { communityGroupsForViewer } from '@/lib/community-groups.server';

export const dynamic = 'force-dynamic';

/** The community chat groups for the account menu. Links only for a signed-in request (community-groups.server.ts). */
export async function GET() {
  const view = await communityGroupsForViewer();
  const groups = view.state === 'signed-in' ? view.groups : [];
  return NextResponse.json(
    { status: view.state, groups },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
