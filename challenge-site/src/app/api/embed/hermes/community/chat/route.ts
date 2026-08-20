import { NextResponse } from 'next/server';
import { verifyCanopiEmbedRequest } from '@/lib/embed-canopi-auth';
import { callHermesCommunityChatForEmbed } from '@/lib/embed-hermes-community';

/** Prompt Hermes in a Community group thread from Canopi Rooms embed iframe. */
export async function POST(request: Request) {
  const auth = await verifyCanopiEmbedRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error || 'unauthorized' }, { status: auth.status || 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const message = String(body.message || '').trim();
    const threadId = String(body.threadId || '').trim();
    const surface = String(body.surface || 'desirableproperties.org/embed/community').slice(0, 80);
    const history = Array.isArray(body.history) ? body.history : [];

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }
    if (!threadId) {
      return NextResponse.json({ error: 'threadId is required' }, { status: 400 });
    }

    const result = await callHermesCommunityChatForEmbed({
      message,
      threadId,
      surface,
      history,
      verifierId: auth.verifierId,
      canopiUserId: auth.userId,
      displayName: auth.displayName,
      dpFocus: typeof body.dpFocus === 'number' ? body.dpFocus : null,
    });

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Community chat failed';
    const status = msg.includes('not found') || msg.includes('Control required') ? 403 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}
