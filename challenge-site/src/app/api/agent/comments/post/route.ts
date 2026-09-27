import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { getCanopiApiBase } from '@/lib/canopi-api';
import { DP_CANOPI_BOOK_ORIGIN, DP_CANOPI_COMMUNITY_ID, canopiBookPageIdsForDp, canopiPageIdFromUrl } from '@/lib/dp-canopi-chapters';
import { buildCanopiCommentBody } from '@/lib/canopi-comment-body';

/**
 * Post an edited Deepi draft to Canopi AS THE SIGNED-IN PERSON (spec §G): mint their Canopi
 * embed token from the Web3Auth session, then POST /api/messages with AI-assisted provenance.
 */
export async function POST(request: Request) {
  const session = await readSession();
  if (!session?.idToken || !session.userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const input = await request.json().catch(() => ({}));
  const dpFocus = typeof input.dpFocus === 'string' || typeof input.dpFocus === 'number' ? String(input.dpFocus) : null;
  const pageId = canopiBookPageIdsForDp(dpFocus)[0] || canopiPageIdFromUrl(`${DP_CANOPI_BOOK_ORIGIN}/viewer/intro`);
  const built = buildCanopiCommentBody(input, { pageId, communityId: DP_CANOPI_COMMUNITY_ID });
  if ('error' in built) return NextResponse.json({ error: built.error }, { status: 400 });

  const base = getCanopiApiBase();
  try {
    const auth = await fetch(`${base}/api/auth/web3auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ idToken: session.idToken }),
      signal: AbortSignal.timeout(20000),
    });
    const authData = await auth.json().catch(() => ({}));
    if (!auth.ok || !authData.embedToken || !authData.user?.id) {
      return NextResponse.json({ error: 'Could not sign you in to Canopi, please sign in again' }, { status: 401 });
    }
    const res = await fetch(`${base}/api/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${authData.embedToken}`,
        'X-User-Id': authData.user.id,
      },
      body: JSON.stringify(built.body),
      signal: AbortSignal.timeout(20000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return NextResponse.json({ error: data.error || 'Canopi rejected the comment' }, { status: res.status });
    const messageId = data.id || data.message?.id || data.data?.id || null;
    return NextResponse.json({ ok: true, messageId, pageId });
  } catch {
    return NextResponse.json({ error: 'Canopi unavailable' }, { status: 502 });
  }
}
