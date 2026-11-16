import { NextResponse } from 'next/server';
import { resolveViewer } from '@/lib/listening/auth.server';
import { listeningWorkspaceEnabled } from '@/lib/listening/flag';
import { listeningPool, readSnapshot } from '@/lib/listening/store.server';
import type { Snapshot } from '@/lib/listening/types';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ slug: string }> };

/** Snapshot of one meeting record plus the cursor to resume the stream from. */
export async function GET(_request: Request, ctx: RouteContext) {
  if (!listeningWorkspaceEnabled()) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const { slug } = await ctx.params;
  const snap = await readSnapshot(slug);
  if (!snap) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const viewer = await resolveViewer(await listeningPool(), snap.meeting.id);
  const body: Snapshot = {
    ...snap,
    viewer: { userId: viewer.userId, name: viewer.name, role: viewer.role, signedIn: viewer.signedIn },
  };
  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
}
