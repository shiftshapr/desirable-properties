import { hermesUpstreamHeaders } from '@/lib/hermes-proxy';
import { getHermesChatUrl } from '@/lib/web3auth-config';

type HistoryTurn = { sender?: string; role?: string; text?: string; content?: string };

export async function callHermesCommunityChatForEmbed(options: {
  message: string;
  threadId: string;
  surface: string;
  history: HistoryTurn[];
  verifierId: string;
  canopiUserId: string;
  displayName?: string | null;
  dpFocus?: number | null;
}): Promise<{ response: string; threadId: string }> {
  const history = (options.history || []).slice(-8).map((turn) => ({
    sender: turn.sender || turn.role || 'user',
    text: String(turn.text || turn.content || '').trim(),
  }));

  const upstream = await fetch(`${getHermesChatUrl()}/api/dp/chat`, {
    method: 'POST',
    headers: hermesUpstreamHeaders(),
    body: JSON.stringify({
      message: options.message,
      history,
      surface: options.surface,
      dpFocus: options.dpFocus ?? null,
      verifierId: options.verifierId,
      displayName: options.displayName || options.verifierId,
      govHubUserId: options.canopiUserId,
      threadId: options.threadId,
      skipMemoryRecord: false,
    }),
    signal: AbortSignal.timeout(120000),
  });

  const raw = await upstream.text();
  let data: { error?: string; response?: string; threadId?: string } = {};
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(upstream.ok ? 'Invalid Deepi response' : 'Deepi unavailable');
    }
  }
  if (!upstream.ok) {
    throw new Error(data.error || 'Deepi unavailable');
  }
  return {
    response: String(data.response || ''),
    threadId: String(data.threadId || options.threadId),
  };
}

export async function createHermesCommunityThread(options: {
  verifierId: string;
  displayName?: string | null;
  canopiUserId?: string | null;
  groupTitle: string;
  surface: string;
  boundPageUrl?: string | null;
}): Promise<{ id: string; title?: string; threadKind?: string; groupTitle?: string | null }> {
  const upstream = await fetch(`${getHermesChatUrl()}/api/hermes/threads`, {
    method: 'POST',
    headers: hermesUpstreamHeaders(),
    body: JSON.stringify({
      verifierId: options.verifierId,
      displayName: options.displayName || options.verifierId,
      govHubUserId: options.canopiUserId || null,
      title: options.groupTitle,
      groupTitle: options.groupTitle,
      threadKind: 'group',
      surface: String(options.surface || 'desirableproperties.org/embed/community').slice(0, 80),
    }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok || !data?.thread?.id) {
    throw new Error(data?.error || 'Could not create Community Chat thread');
  }
  return data.thread;
}
