'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DpDialogHost } from '@/components/DpDialog';
import CommunityChatComposer from '@/components/community/CommunityChatComposer';
import CommunityChatMessageItem from '@/components/community/CommunityChatMessageItem';
import HermesExperimentalInstructionsModal from '@/components/workgroup/HermesExperimentalInstructionsModal';
import HermesAmbientFacilitatorQueue from '@/components/workgroup/HermesAmbientFacilitatorQueue';
import WorkgroupHermesPanel from '@/components/workgroup/WorkgroupHermesPanel';
import {
  assessCommunityHermesAmbient,
  fetchCommunityHermesHands,
} from '@/lib/community-ambient-api';
import {
  fetchCommunityMessages,
  patchCommunityMessage,
  postCommunityMessage,
} from '@/lib/community-collab-api';
import { communityMessageAsWorkgroup } from '@/lib/community-collab-types';
import { isHermesExperimentalInstructionsDismissed } from '@/lib/hermes-experimental-instructions';
import type { WorkgroupAskNote } from '@/lib/workgroup-hermes-panel-types';
import type { HermesHand } from '@/lib/hermes-ambient-types';
import type { WorkgroupMessage } from '@/lib/workgroup-collab-types';

type Props = {
  communityThreadId: string;
  communityTitle: string;
  currentUserId?: string | null;
  dpFocus?: number | null;
  signedIn: boolean;
  canPrompt: boolean;
  legacySharedTurns?: boolean;
};

export default function CommunityChatPanel({
  communityThreadId,
  communityTitle,
  currentUserId = null,
  dpFocus = null,
  signedIn,
  canPrompt,
  legacySharedTurns = false,
}: Props) {
  const [messages, setMessages] = useState<WorkgroupMessage[]>([]);
  const [canPost, setCanPost] = useState(false);
  const [loading, setLoading] = useState(true);
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
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState(false);

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
    if (!canPrompt) return;
    try {
      const data = await fetchCommunityHermesHands(communityThreadId);
      setAmbientConfigured(data.configured);
      setHands(data.hands || []);
      setPendingQueue(data.pending || []);
    } catch {
      // Non-fatal
    }
  }, [canPrompt, communityThreadId]);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchCommunityMessages(communityThreadId, { full: true });
      setMessages((data.messages || []).map(communityMessageAsWorkgroup));
      setCanPost(Boolean(data.can_post));
      setError(null);
      if (data.can_prompt) {
        await refreshHands();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [communityThreadId, refreshHands]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function triggerAmbientAssess(message: WorkgroupMessage, allMessages: WorkgroupMessage[]) {
    if (!canPrompt) return;
    try {
      const result = await assessCommunityHermesAmbient(communityThreadId, {
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
      const result = await postCommunityMessage(communityThreadId, body);
      let newMessage = result.message ? communityMessageAsWorkgroup(result.message) : null;
      let nextMessages = messages;

      if (newMessage) {
        nextMessages = [...messages, newMessage];
        setMessages(nextMessages);
      } else {
        await refresh();
        const data = await fetchCommunityMessages(communityThreadId, { full: true });
        nextMessages = (data.messages || []).map(communityMessageAsWorkgroup);
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
      const el = document.getElementById('community-chat-body') as HTMLTextAreaElement | null;
      el?.focus();
    });
  }

  async function handleSaveEdit(messageId: string, body: string) {
    setEditBusy(true);
    try {
      const result = await patchCommunityMessage(communityThreadId, messageId, body);
      if (result.message) {
        const updated = communityMessageAsWorkgroup(result.message);
        setMessages((prev) => prev.map((m) => (m.id === messageId ? updated : m)));
      } else {
        await refresh();
      }
      setEditingMessageId(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save edit');
    } finally {
      setEditBusy(false);
    }
  }

  function canEditMessage(msg: WorkgroupMessage): boolean {
    if (!canPost || !currentUserId) return false;
    if (msg.source === 'deepi_shared') return false;
    return msg.author_user_id === currentUserId;
  }

  const hermesBadgeCount =
    hands.filter((h) => h.status !== 'dismissed' && h.status !== 'shared').length
    + askNotes.filter((n) => !n.shared).length;

  return (
    <div className="relative">
      <DpDialogHost />
      <HermesExperimentalInstructionsModal
        open={hermesInstructionsOpen}
        workgroupSlug="community"
        workgroupName={communityTitle}
        onClose={() => setHermesInstructionsOpen(false)}
      />

      {legacySharedTurns ? (
        <p className="mb-4 rounded-lg border border-amber-800/50 bg-amber-950/20 px-3 py-2 text-sm text-amber-100">
          Community Chat now uses member chat plus private Deepi in the sidebar, like workgroup Collab.
          Earlier shared Deepi messages in this room are archived and no longer appear here.
        </p>
      ) : null}

      <div className="lg:flex lg:min-h-[32rem] lg:items-stretch">
        <div className="min-w-0 flex-1">
          <div className="flex items-end justify-between gap-3">
            <p className="text-sm text-slate-400">
              Member chat – refreshes every 30s.
              {canPrompt ? ' Use Ask Deepi (✦) in the composer for private replies anytime.' : ''}
              {canPrompt && ambientConfigured ? ' Deepi may also raise its hand after messages.' : ''}
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

          {canPrompt ? (
            <HermesAmbientFacilitatorQueue pending={pendingQueue} onOpen={handleOpenHand} />
          ) : null}

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
                  <CommunityChatMessageItem
                    key={msg.id}
                    message={msg}
                    hands={msgHands}
                    canPrompt={canPrompt}
                    canEdit={canEditMessage(msg)}
                    editing={editingMessageId === msg.id}
                    editBusy={editBusy}
                    onStartEdit={() => setEditingMessageId(msg.id)}
                    onCancelEdit={() => setEditingMessageId(null)}
                    onSaveEdit={(body) => handleSaveEdit(msg.id, body)}
                    onOpenHand={handleOpenHand}
                  />
                );
              })
            )}
          </div>

          <div className="mt-5 border-t border-slate-800 pt-4">
            <CommunityChatComposer
              communityThreadId={communityThreadId}
              communityTitle={communityTitle}
              dpFocus={dpFocus}
              recentMessages={messages}
              recentAskNotes={askNotes}
              canPost={canPost}
              signedIn={signedIn}
              busy={posting}
              onSend={handleSend}
              adoptDraft={adoptDraft}
              onHermesReply={canPrompt ? handleHermesReply : undefined}
              onOpenHermesInstructions={() => setHermesInstructionsOpen(true)}
            />
          </div>
        </div>

        {canPrompt ? (
          <WorkgroupHermesPanel
            communityThreadId={communityThreadId}
            postToChat={(body) => postCommunityMessage(communityThreadId, body).then(() => undefined)}
            dpId={dpFocus ? `DP${dpFocus}` : null}
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
        ) : null}
      </div>
    </div>
  );
}
