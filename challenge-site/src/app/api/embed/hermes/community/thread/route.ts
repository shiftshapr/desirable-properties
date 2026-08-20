import { NextResponse } from 'next/server';
import { hermesUpstreamHeaders } from '@/lib/hermes-proxy';
import { getHermesChatUrl } from '@/lib/web3auth-config';
import { verifyCanopiEmbedRequest } from '@/lib/embed-canopi-auth';

/** Load Hermes thread turns for Community Hermes embed (Canopi Rooms iframe). */
export async function GET(request: Request) {
  const auth = await verifyCanopiEmbedRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error || 'unauthorized' }, { status: auth.status || 401 });
  }

  const { searchParams } = new URL(request.url);
  const threadId = String(searchParams.get('threadId') || '').trim();
  if (!threadId) {
    return NextResponse.json({ error: 'threadId required' }, { status: 400 });
  }

  const upstream = await fetch(
    `${getHermesChatUrl()}/api/hermes/threads/${encodeURIComponent(threadId)}?verifierId=${encodeURIComponent(auth.verifierId)}`,
    { headers: hermesUpstreamHeaders(), signal: AbortSignal.timeout(15000) },
  );
  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}
