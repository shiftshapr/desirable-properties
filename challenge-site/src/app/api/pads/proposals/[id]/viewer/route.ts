import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { resolveWorkgroupRouteId } from '@/lib/workgroup-route-id.server';
import { fetchViewerCoEditor } from '@/lib/workgroup-review-govhub';

/**
 * Whether the signed-in viewer decides this DP's proposals (Gov Hub's co-editor check), so the pad loads the Review
 * queue only for co-editors. ?wg=<workgroup slug or id>.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await readSession();
  const wg = new URL(request.url).searchParams.get('wg') || '';
  if (!session?.idToken || !wg) return NextResponse.json({ isCoEditor: false });
  const workgroupId = await resolveWorkgroupRouteId(wg);
  if (!workgroupId) return NextResponse.json({ isCoEditor: false });
  const viewer = await fetchViewerCoEditor(workgroupId, session.idToken);
  return NextResponse.json({ isCoEditor: viewer.isCoEditor }, { headers: { 'Cache-Control': 'no-store' } });
}
