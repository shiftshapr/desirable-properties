'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DpDialogHost } from '@/components/DpDialog';
import HermesExperimentalInstructionsModal from '@/components/workgroup/HermesExperimentalInstructionsModal';
import WorkgroupChatComposer from '@/components/workgroup/WorkgroupChatComposer';
import HermesAmbientFacilitatorQueue from '@/components/workgroup/HermesAmbientFacilitatorQueue';
import HermesAmbientHandBadge from '@/components/workgroup/HermesAmbientHandBadge';
import HermesAmbientSettingsPanel from '@/components/workgroup/HermesAmbientSettingsPanel';
import WorkgroupHermesPanel from '@/components/workgroup/WorkgroupHermesPanel';
import WorkgroupMessageBody from '@/components/workgroup/WorkgroupMessageBody';
import WorkgroupMessageShareModal from '@/components/workgroup/WorkgroupMessageShareModal';
import {
  assessHermesAmbient,
  fetchHermesHands,
} from '@/lib/hermes-ambient-api';
import { fetchWorkgroupMemberRoster, fetchWorkgroupMessages, postWorkgroupMessage } from '@/lib/workgroup-collab-api';
import { isHermesExperimentalInstructionsDismissed } from '@/lib/hermes-experimental-instructions';
import type { WorkgroupAskNote } from '@/lib/workgroup-hermes-panel-types';
import type { HermesHand } from '@/lib/hermes-ambient-types';
import UserDateTime from '@/components/UserDateTime';
import type { WorkgroupMessage } from '@/lib/workgroup-collab-types';
import {
  canMemberShareMessage,
} from '@/lib/workgroup-share-restrictions';

type Props = {
  workgroupId: string;
  workgroupSlug: string;
  workgroupName: string;
  dpId: string | null;
  signedIn: boolean;
  sharerUserId?: string | null;
  initialMessages?: WorkgroupMessage[];
  initialIsMember?: boolean;
  initialCanPost?: boolean;
};

export default function WorkgroupChatPanel({
  workgroupId,
  workgroupSlug,
  workgroupName,
  dpId,
  signedIn,
  sharerUserId = null,
  initialMessages = [],
  initialIsMember = false,
  initialCanPost = false,
}: Props) {
  const [messages, setMessages] = useState<WorkgroupMessage[]>(initialMessages);
  const [isMember, setIsMember] = useState(initialIsMember);
  const [canPost, setCanPost] = useState(initialCanPost || initialIsMember);
  const [loading, setLoading] = useState(!initialIsMember);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hands, setHands] = useState<HermesHand[]>([]);
  const [pendingQueue, setPendingQueue] = useState<HermesHand[]>([]);
  const [ambientConfigured, setAmbientConfigured] = useState(false);
  const [activeHand, setActiveHand] = useState<HermesHand | null>(null);
  const [askNotes, setAskNotes] = useState<WorkgroupAskNote[]>([]);
  const [activeAskNote, setActiveAskNote] = useState<WorkgroupAskNote | null>(null);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [mobileHermesOpen, setMobileHermesOpen] = useState(false);
  const [adoptDraft, setAdoptDraft] = useState<{ key: number; text: string } | null>(null);
  const [hermesInstructionsOpen, setHermesInstructionsOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState<WorkgroupMessage | null>(null);
  const [sharerPositions, setSharerPositions] = useState<string[]>([]);

  useEffect(() => {
    if (!isMember || !sharerUserId) {
      setSharerPositions([]);
      return;
    }
    void fetchWorkgroupMemberRoster(workgroupId)
      .then((data) => {
        const self = (data.members || []).find((m) => m.user_id === sharerUserId);
        setSharerPositions(self?.positions ?? []);
      })
      .catch(() => setSharerPositions([]));
  }, [isMember, sharerUserId, workgroupId]);

  useEffect(() => {
    if (!isHermesExperimentalInstructionsDismissed()) {
      setHermesInstructionsOpen(true);
    }
  }, []);

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
      setIsMember((prev) => Boolean(data.is_member) || prev);
      setCanPost((prev) => Boolean(data.can_post) || prev);
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
    if (updated.status === 'dismissed' && activeHand?.id === updated.id) {
      setActiveHand(null);
    } else if (activeHand?.id === updated.id) {
      setActiveHand(updated);
    }
  }

  function handleOpenHand(hand: HermesHand) {
    setActiveHand(hand);
    setActiveAskNote(null);
    setMobileHermesOpen(true);
  }

  function handleHermesReply(note: WorkgroupAskNote) {
    setAskNotes((prev) => [note, ...prev]);
    setActiveAskNote(note);
    setActiveHand(null);
    setMobileHermesOpen(true);
  }

  function handleAdoptAsPost(text: string) {
    setAdoptDraft({ key: Date.now(), text });
    setMobileHermesOpen(false);
    requestAnimationFrame(() => {
      const el = document.getElementById('wg-chat-body') as HTMLTextAreaElement | null;
      el?.focus();
    });
  }

  const hermesBadgeCount =
    hands.filter((h) => h.status !== 'dismissed' && h.status !== 'shared').length + askNotes.filter((n) => !n.shared).length;

  return (
    <div className="relative">
      <DpDialogHost />
      <WorkgroupMessageShareModal
        open={Boolean(shareMessage)}
        workgroupId={workgroupId}
        workgroupName={workgroupName}
        messageId={shareMessage?.id || ''}
        messagePreview={shareMessage?.body || ''}
        messageAuthorUserId={shareMessage?.author_user_id || ''}
        sharerUserId={sharerUserId || ''}
        sharerPositions={sharerPositions}
        onClose={() => setShareMessage(null)}
      />
      <HermesExperimentalInstructionsModal
        open={hermesInstructionsOpen}
        workgroupSlug={workgroupSlug}
        workgroupName={workgroupName}
        onClose={() => setHermesInstructionsOpen(false)}
      />

      <div className="lg:flex lg:min-h-[32rem] lg:items-stretch">
        <div className="min-w-0 flex-1">
          <HermesAmbientSettingsPanel workgroupId={workgroupId} />

          <HermesAmbientFacilitatorQueue pending={pendingQueue} onOpen={handleOpenHand} />

          <div className="flex items-end justify-between gap-3">
            <p className="text-sm text-slate-400">
              {isMember ? 'Member view – refreshes every 30s.' : 'Loading membership…'}
              {ambientConfigured ? ' Deepi may raise its hand after messages.' : ''}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileHermesOpen(true)}
                className="inline-flex items-center gap-1 text-xs text-violet-300 hover:text-violet-200 lg:hidden"
              >
                Deepi
                {hermesBadgeCount > 0 ? (
                  <span className="rounded-full bg-violet-800 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {hermesBadgeCount}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => void refresh()}
                className="text-xs text-slate-400 hover:text-cyan-300"
              >
                Refresh
              </button>
            </div>
          </div>

          {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

          <div className="mt-5 max-h-[28rem] space-y-3 overflow-y-auto pr-1 lg:max-h-[calc(100vh-22rem)]">
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
                    className="group rounded-lg border border-slate-800/80 bg-slate-950/40 px-4 py-3"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-medium text-cyan-200">{msg.author_name || 'Member'}</span>
                      <UserDateTime
                        value={msg.created_at}
                        mode="short"
                        className="text-xs text-slate-500"
                      />
                    </div>
                    <WorkgroupMessageBody body={msg.body} />
                    {msgHands.map((hand) => (
                      <HermesAmbientHandBadge
                        key={hand.id}
                        hand={hand}
                        onOpen={handleOpenHand}
                      />
                    ))}
                    {isMember && sharerUserId
                    && canMemberShareMessage(msg, sharerUserId, sharerPositions) ? (
                      <div className="mt-2 flex justify-end opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                        <button
                          type="button"
                          onClick={() => setShareMessage(msg)}
                          className="rounded-md border border-slate-600 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800/80"
                        >
                          Share
                        </button>
                      </div>
                    ) : null}
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
              adoptDraft={adoptDraft}
              onHermesReply={handleHermesReply}
              onOpenHermesInstructions={() => setHermesInstructionsOpen(true)}
            />
          </div>
        </div>

        <WorkgroupHermesPanel
          workgroupId={workgroupId}
          workgroupSlug={workgroupSlug}
          dpId={dpId}
          recentMessages={messages}
          hands={hands}
          askNotes={askNotes}
          activeHand={activeHand}
          activeAskNote={activeAskNote}
          onSelectHand={(hand) => {
            setActiveHand(hand);
            setActiveAskNote(null);
          }}
          onSelectAskNote={(note) => {
            setActiveAskNote(note);
            setActiveHand(null);
          }}
          onHandUpdated={handleHandUpdated}
          onAskNoteUpdated={(note) => {
            setAskNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
            if (activeAskNote?.id === note.id) setActiveAskNote(note);
          }}
          onAdoptAsPost={handleAdoptAsPost}
          onMessagePosted={() => void refresh()}
          collapsed={panelCollapsed}
          onToggleCollapse={() => setPanelCollapsed((c) => !c)}
          mobileOpen={mobileHermesOpen}
          onMobileClose={() => setMobileHermesOpen(false)}
          onOpenHermesInstructions={() => setHermesInstructionsOpen(true)}
        />
      </div>
    </div>
  );
}
