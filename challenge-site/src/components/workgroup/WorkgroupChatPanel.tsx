'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DpDialogHost } from '@/components/DpDialog';
import WorkgroupChatComposer from '@/components/workgroup/WorkgroupChatComposer';
import HermesAmbientFacilitatorQueue from '@/components/workgroup/HermesAmbientFacilitatorQueue';
import HermesAmbientHandBadge from '@/components/workgroup/HermesAmbientHandBadge';
import HermesAmbientSettingsPanel from '@/components/workgroup/HermesAmbientSettingsPanel';
import HermesAmbientSidePanel from '@/components/workgroup/HermesAmbientSidePanel';
import {
  assessHermesAmbient,
  fetchHermesHands,
} from '@/lib/hermes-ambient-api';
import { fetchWorkgroupMessages, postWorkgroupMessage } from '@/lib/workgroup-collab-api';
import type { HermesHand } from '@/lib/hermes-ambient-types';
import type { WorkgroupMessage } from '@/lib/workgroup-collab-types';

type Props = {
  workgroupId: string;
  workgroupSlug: string;
  workgroupName: string;
  dpId: string | null;
  signedIn: boolean;
  initialMessages?: WorkgroupMessage[];
  initialIsMember?: boolean;
};

function formatWhen(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function WorkgroupChatPanel({
  workgroupId,
  workgroupSlug,
  workgroupName,
  dpId,
  signedIn,
  initialMessages = [],
  initialIsMember = false,
}: Props) {
  const [messages, setMessages] = useState<WorkgroupMessage[]>(initialMessages);
  const [isMember, setIsMember] = useState(initialIsMember);
  const [canPost, setCanPost] = useState(initialIsMember);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hands, setHands] = useState<HermesHand[]>([]);
  const [pendingQueue, setPendingQueue] = useState<HermesHand[]>([]);
  const [ambientConfigured, setAmbientConfigured] = useState(false);
  const [activeHand, setActiveHand] = useState<HermesHand | null>(null);

  const handsByMessage = useMemo(() => {
    const map = new Map<string, HermesHand[]>();
    for (const hand of hands) {
      const list = map.get(hand.triggerMessageId) || [];
      list.push(hand);
      map.set(hand.triggerMessageId, list);
    }
    return map;
  }, [hands]);

  const refreshHands = useCallback(async () => {
    try {
      const data = await fetchHermesHands(workgroupId);
      setAmbientConfigured(data.configured);
      setHands(data.hands || []);
      setPendingQueue(data.pending || []);
    } catch {
      // Non-fatal — ambient is optional
    }
  }, [workgroupId]);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchWorkgroupMessages(workgroupId, { full: true });
      setMessages(data.messages || []);
      setIsMember(Boolean(data.is_member));
      setCanPost(Boolean(data.can_post));
      setError(null);
      await refreshHands();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [workgroupId, refreshHands]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function triggerAmbientAssess(message: WorkgroupMessage, allMessages: WorkgroupMessage[]) {
    try {
      const result = await assessHermesAmbient(workgroupId, {
        messageId: message.id,
        messageBody: message.body,
        authorUserId: message.author_user_id,
        recentMessages: allMessages.slice(-12).map((m) => ({
          id: m.id,
          author_name: m.author_name,
          body: m.body,
        })),
      });
      if (result.hand) {
        setHands((prev) => [result.hand!, ...prev.filter((h) => h.id !== result.hand!.id)]);
      }
    } catch {
      // Non-fatal
    }
  }

  async function handleSend(body: string) {
    setPosting(true);
    try {
      const result = await postWorkgroupMessage(workgroupId, body);
      let newMessage = result.message;
      let nextMessages = messages;

      if (newMessage) {
        nextMessages = [...messages, newMessage];
        setMessages(nextMessages);
      } else {
        await refresh();
        const data = await fetchWorkgroupMessages(workgroupId, { full: true });
        nextMessages = data.messages || [];
        newMessage = nextMessages[nextMessages.length - 1];
      }

      if (newMessage) {
        void triggerAmbientAssess(newMessage, nextMessages);
      }
    } finally {
      setPosting(false);
    }
  }

  function handleHandUpdated(updated: HermesHand) {
    setHands((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
    setPendingQueue((prev) =>
      prev
        .map((h) => (h.id === updated.id ? updated : h))
        .filter((h) => h.status === 'opened' && h.visibility === 'private'),
    );
    setActiveHand((prev) => (prev?.id === updated.id ? updated : prev));
  }

  function handleOpenHand(hand: HermesHand) {
    setActiveHand(hand);
  }

  return (
    <div className="relative">
      <DpDialogHost />

      <HermesAmbientSettingsPanel workgroupId={workgroupId} />

      <HermesAmbientFacilitatorQueue pending={pendingQueue} onOpen={handleOpenHand} />

      <div className="flex items-end justify-between gap-3">
        <p className="text-sm text-slate-400">
          {isMember ? 'Member view – refreshes every 30s.' : 'Loading membership…'}
          {ambientConfigured ? ' Hermes may raise its hand after messages.' : ''}
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="text-xs text-slate-400 hover:text-cyan-300"
        >
          Refresh
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

      <div className="mt-5 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
        {loading && messages.length === 0 ? (
          <p className="text-sm text-slate-500">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-slate-500">No messages yet. Start the conversation.</p>
        ) : (
          messages.map((msg) => {
            const msgHands = handsByMessage.get(msg.id) || [];
            return (
              <article
                key={msg.id}
                className="rounded-lg border border-slate-800/80 bg-slate-950/40 px-4 py-3"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium text-cyan-200">{msg.author_name || 'Member'}</span>
                  <time className="text-xs text-slate-500">{formatWhen(msg.created_at)}</time>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                  {msg.body}
                </p>
                {msgHands.map((hand) => (
                  <HermesAmbientHandBadge
                    key={hand.id}
                    hand={hand}
                    onOpen={handleOpenHand}
                  />
                ))}
              </article>
            );
          })
        )}
      </div>

      <div className="mt-5 border-t border-slate-800 pt-4">
        <WorkgroupChatComposer
          workgroupSlug={workgroupSlug}
          workgroupName={workgroupName}
          dpId={dpId}
          recentMessages={messages}
          canPost={canPost}
          signedIn={signedIn}
          busy={posting}
          onSend={handleSend}
        />
      </div>

      {activeHand ? (
        <HermesAmbientSidePanel
          hand={activeHand}
          workgroupId={workgroupId}
          workgroupSlug={workgroupSlug}
          dpId={dpId}
          recentMessages={messages}
          onClose={() => setActiveHand(null)}
          onUpdated={handleHandUpdated}
        />
      ) : null}
    </div>
  );
}
