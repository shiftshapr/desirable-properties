'use client';

import { useEffect, useState } from 'react';
import HermesMarkdown from '@/components/HermesMarkdown';
import { DpDialog } from '@/components/DpDialog';
import UserDateTime from '@/components/UserDateTime';
import HermesExperimentalBadge from '@/components/workgroup/HermesExperimentalBadge';
import {
  dismissHermesHand,
  openHermesHand,
  shareHermesHand,
} from '@/lib/hermes-ambient-api';
import {
  dismissCommunityHermesHand,
  openCommunityHermesHand,
  shareCommunityHermesHand,
} from '@/lib/community-ambient-api';
import { HERMES_MODE_LABELS, type HermesHand } from '@/lib/hermes-ambient-types';
import { DP_COMMUNITY_AI } from '@/lib/dp-community-ai';
import { buildSharedAskBody } from '@/lib/workgroup-hermes-share';
import { markdownToPlainText } from '@/lib/markdown-to-plain-text';
import { postWorkgroupMessage } from '@/lib/workgroup-collab-api';
import type { WorkgroupAskNote } from '@/lib/workgroup-hermes-panel-types';
import type { WorkgroupMessage } from '@/lib/workgroup-collab-types';

type Props = {
  workgroupId?: string;
  workgroupSlug?: string;
  communityThreadId?: string;
  postToChat?: (body: string) => Promise<void>;
  dpId: string | null;
  recentMessages: WorkgroupMessage[];
  hands: HermesHand[];
  askNotes: WorkgroupAskNote[];
  activeHand: HermesHand | null;
  activeAskNote: WorkgroupAskNote | null;
  onSelectHand: (hand: HermesHand) => void;
  onSelectAskNote: (note: WorkgroupAskNote) => void;
  onHandUpdated: (hand: HermesHand) => void;
  onAskNoteUpdated: (note: WorkgroupAskNote) => void;
  onAdoptAsPost: (text: string) => void;
  onMessagePosted?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onOpenHermesInstructions?: () => void;
};

function HermesPanelChevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
      <path
        d={direction === 'left' ? 'M12 5l-5 5 5 5' : 'M8 5l5 5-5 5'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function WorkgroupHermesPanel({
  workgroupId = '',
  workgroupSlug = '',
  communityThreadId,
  postToChat,
  dpId,
  recentMessages,
  hands,
  askNotes,
  activeHand,
  activeAskNote,
  onSelectHand,
  onSelectAskNote,
  onHandUpdated,
  onAskNoteUpdated,
  onAdoptAsPost,
  onMessagePosted,
  collapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onMobileClose,
  onOpenHermesInstructions,
}: Props) {
  const isCommunity = Boolean(communityThreadId);
  const scopeId = communityThreadId || workgroupId;

  async function openScopedHand(
    handId: string,
    input: {
      dpFocus?: number | null;
      recentMessages: Array<{ author_name?: string; body: string }>;
    },
  ) {
    if (isCommunity && communityThreadId) {
      return openCommunityHermesHand(communityThreadId, handId, input);
    }
    return openHermesHand(workgroupId, handId, {
      workgroupSlug,
      dpFocus: input.dpFocus,
      recentMessages: input.recentMessages,
    });
  }

  async function shareScopedHand(handId: string) {
    if (isCommunity && communityThreadId) {
      return shareCommunityHermesHand(communityThreadId, handId);
    }
    return shareHermesHand(workgroupId, handId);
  }

  async function dismissScopedHand(handId: string) {
    if (isCommunity && communityThreadId) {
      return dismissCommunityHermesHand(communityThreadId, handId);
    }
    return dismissHermesHand(workgroupId, handId);
  }

  async function postSharedMessage(body: string) {
    if (postToChat) {
      await postToChat(body);
      return;
    }
    await postWorkgroupMessage(workgroupId, body);
  }

  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localHand, setLocalHand] = useState<HermesHand | null>(activeHand);

  useEffect(() => {
    setLocalHand(activeHand);
    setError(null);
  }, [activeHand]);

  const visibleHands = hands.filter((h) => h.status !== 'dismissed');
  const pendingHands = visibleHands.filter((h) => h.status === 'raised' || (h.status === 'opened' && h.visibility === 'private'));
  const hasContent = pendingHands.length > 0 || askNotes.length > 0 || activeHand || activeAskNote;
  const pendingAskNotes = askNotes.filter((n) => !n.shared);
  const railBadgeCount =
    visibleHands.filter((h) => h.status !== 'dismissed' && h.status !== 'shared').length + pendingAskNotes.length;
  const showRailOnly = collapsed && !mobileOpen;

  const collapsedRail = (
    <nav
      className="flex flex-1 flex-col items-center gap-2 py-3"
      aria-label={`${DP_COMMUNITY_AI.name} private panel`}
    >
      {onToggleCollapse ? (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
          aria-label="Expand panel"
          title="Expand panel"
        >
          <HermesPanelChevron direction="left" />
        </button>
      ) : null}

      <button
        type="button"
        onClick={onToggleCollapse}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-violet-300 hover:bg-violet-950/50 hover:text-violet-200"
        aria-label={`${DP_COMMUNITY_AI.name} private panel`}
        title={`${DP_COMMUNITY_AI.name} private panel`}
      >
        <span className="text-base" aria-hidden="true">✦</span>
        {railBadgeCount > 0 ? (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-700 px-1 text-[10px] font-bold leading-none text-white"
            aria-hidden="true"
          >
            {railBadgeCount > 9 ? '9+' : railBadgeCount}
          </span>
        ) : null}
      </button>

      {pendingHands.length > 0 ? (
        <button
          type="button"
          onClick={() => {
            onToggleCollapse?.();
            onSelectHand(pendingHands[0]);
          }}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-amber-200 hover:bg-amber-950/40"
          aria-label={`Raised hands (${pendingHands.length})`}
          title={`Raised hands (${pendingHands.length})`}
        >
          <span className="text-base" aria-hidden="true">✋</span>
          <span
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-700 px-1 text-[10px] font-bold leading-none text-white"
            aria-hidden="true"
          >
            {pendingHands.length > 9 ? '9+' : pendingHands.length}
          </span>
        </button>
      ) : null}

      {pendingAskNotes.length > 0 ? (
        <button
          type="button"
          onClick={() => {
            onToggleCollapse?.();
            onSelectAskNote(pendingAskNotes[0]);
          }}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-cyan-200 hover:bg-cyan-950/40"
          aria-label={`Ask ${DP_COMMUNITY_AI.name} replies (${pendingAskNotes.length})`}
          title={`Ask ${DP_COMMUNITY_AI.name} replies (${pendingAskNotes.length})`}
        >
          <span className="text-sm font-bold" aria-hidden="true">✦</span>
          <span
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-700 px-1 text-[10px] font-bold leading-none text-white"
            aria-hidden="true"
          >
            {pendingAskNotes.length > 9 ? '9+' : pendingAskNotes.length}
          </span>
        </button>
      ) : null}

      {onOpenHermesInstructions ? (
        <button
          type="button"
          onClick={onOpenHermesInstructions}
          className="mt-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 text-xs font-bold text-slate-400 hover:border-slate-600 hover:text-white"
          aria-label={`How ${DP_COMMUNITY_AI.name} works`}
          title={`How ${DP_COMMUNITY_AI.name} works`}
        >
          ?
        </button>
      ) : null}
    </nav>
  );

  const expandedPanel = (
    <>
      <header className="flex items-start justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-violet-400">{DP_COMMUNITY_AI.name}</p>
            <HermesExperimentalBadge />
          </div>
          <h2 className="text-base font-semibold text-white">Private panel</h2>
          <p className="mt-1 text-xs text-slate-500">Raised hands &amp; Ask {DP_COMMUNITY_AI.name} replies</p>
        </div>
        <div className="flex items-center gap-1">
          {onOpenHermesInstructions ? (
            <button
              type="button"
              onClick={onOpenHermesInstructions}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-600 text-xs font-bold text-slate-300 hover:border-slate-500 hover:text-white"
              aria-label="How Deepi works"
              title="How Deepi works"
            >
              ?
            </button>
          ) : null}
          {onToggleCollapse ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:inline-flex"
              aria-label={`Collapse ${DP_COMMUNITY_AI.name} panel`}
              title={`Collapse ${DP_COMMUNITY_AI.name} panel`}
            >
              <HermesPanelChevron direction="right" />
            </button>
          ) : null}
          {onMobileClose ? (
            <button
              type="button"
              onClick={onMobileClose}
              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
              aria-label="Close panel"
            >
              ✕
            </button>
          ) : null}
        </div>
      </header>

      <>
          {(pendingHands.length > 0 || askNotes.length > 0) && !activeHand && !activeAskNote ? (
            <div className="border-b border-slate-800 px-4 py-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Your notes</p>
              <ul className="space-y-1">
                {pendingHands.map((hand) => (
                  <li key={hand.id}>
                    <button
                      type="button"
                      onClick={() => onSelectHand(hand)}
                      className="w-full rounded-lg border border-violet-900/40 bg-violet-950/20 px-3 py-2 text-left text-sm text-violet-100 hover:border-violet-700"
                    >
                      <span className="mr-1" aria-hidden="true">✋</span>
                      {HERMES_MODE_LABELS[hand.mode]} – {hand.teaser?.slice(0, 48) || 'Raised hand'}
                    </button>
                  </li>
                ))}
                {askNotes.map((note) => (
                  <li key={note.id}>
                    <button
                      type="button"
                      onClick={() => onSelectAskNote(note)}
                      className="w-full rounded-lg border border-cyan-900/40 bg-cyan-950/20 px-3 py-2 text-left text-sm text-cyan-100 hover:border-cyan-700"
                    >
                      <span className="mr-1" aria-hidden="true">✦</span>
                      {note.promptLabel}
                      {note.shared ? ' (shared)' : ''}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {!hasContent ? (
              <p className="text-sm text-slate-500">
                Use Ask {DP_COMMUNITY_AI.name} in the composer (✦ button) anytime for a private reply here.
                {isCommunity
                  ? ' After others post in Community Chat, Deepi may also raise its hand.'
                  : ' After others post, Deepi may also raise its hand.'}{' '}
                Nothing posts to the group until you choose.
              </p>
            ) : null}

            {activeHand ? (
              <HandDetail
                hand={localHand || activeHand}
                workgroupId={workgroupId}
                workgroupSlug={workgroupSlug}
                dpId={dpId}
                recentMessages={recentMessages}
                loading={loading}
                sharing={sharing}
                error={error}
                onHandUpdated={onHandUpdated}
                onAdoptAsPost={onAdoptAsPost}
                onEnsureOpened={async () => {
                  const display = localHand || activeHand;
                  if (display.fullReply) return display;
                  setLoading(true);
                  setError(null);
                  try {
                    const dpFocus = dpId ? Number(dpId.replace(/\D/g, '')) || null : null;
                    const result = await openScopedHand(display.id, {
                      dpFocus,
                      recentMessages: recentMessages.map((m) => ({
                        author_name: m.author_name,
                        body: m.body,
                      })),
                    });
                    setLocalHand(result.hand);
                    onHandUpdated(result.hand);
                    return result.hand;
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to open note');
                    return display;
                  } finally {
                    setLoading(false);
                  }
                }}
                onShare={async () => {
                  const display = localHand || activeHand;
                  let hand = display;
                  if (!hand.fullReply) {
                    hand = (await openScopedHand(hand.id, {
                      dpFocus: dpId ? Number(dpId.replace(/\D/g, '')) || null : null,
                      recentMessages: recentMessages.map((m) => ({
                        author_name: m.author_name,
                        body: m.body,
                      })),
                    })).hand;
                    setLocalHand(hand);
                    onHandUpdated(hand);
                  }
                  const ok = await DpDialog.confirm({
                    title: isCommunity ? 'Share with Community Chat?' : 'Share with workgroup?',
                    message: `This will post ${DP_COMMUNITY_AI.name}'s note to the main chat thread with clear attribution.`,
                    variant: 'warning',
                    confirmLabel: 'Share',
                  });
                  if (!ok) return;
                  setSharing(true);
                  setError(null);
                  try {
                    const result = await shareScopedHand(hand.id);
                    setLocalHand(result.hand);
                    onHandUpdated(result.hand);
                    onMessagePosted?.();
                    await DpDialog.alert({
                      title: 'Shared with group',
                      message: isCommunity
                        ? `${DP_COMMUNITY_AI.name}'s note was posted to Community Chat.`
                        : `${DP_COMMUNITY_AI.name}'s note was posted to the workgroup chat.`,
                      variant: 'success',
                    });
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to share');
                  } finally {
                    setSharing(false);
                  }
                }}
                onDismiss={async () => {
                  const ok = await DpDialog.confirm({
                    title: 'Dismiss note?',
                    message: `This private ${DP_COMMUNITY_AI.name} note will be hidden.`,
                    variant: 'info',
                    confirmLabel: 'Dismiss',
                  });
                  if (!ok) return;
                  try {
                    await dismissScopedHand(activeHand.id);
                    onHandUpdated({ ...activeHand, status: 'dismissed' });
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to dismiss');
                  }
                }}
              />
            ) : null}

            {activeAskNote ? (
              <AskNoteDetail
                note={activeAskNote}
                error={error}
                sharing={sharing}
                onShare={async () => {
                  if (activeAskNote.shared) return;
                  const askedText = (activeAskNote.question || activeAskNote.promptLabel || '').trim();
                  const ok = await DpDialog.confirm({
                    title: isCommunity ? 'Share with Community Chat?' : 'Share with workgroup?',
                    message: askedText
                      ? `This will post your question and ${DP_COMMUNITY_AI.name}'s reply to the main chat thread with clear attribution.`
                      : `This will post ${DP_COMMUNITY_AI.name}'s reply to the main chat thread with clear attribution.`,
                    variant: 'warning',
                    confirmLabel: 'Share',
                  });
                  if (!ok) return;
                  setSharing(true);
                  setError(null);
                  try {
                    const modeLabel = HERMES_MODE_LABELS[activeAskNote.mode];
                    const shareBody = buildSharedAskBody({
                      modeLabel,
                      reply: activeAskNote.reply,
                      question: activeAskNote.question,
                      promptLabel: activeAskNote.promptLabel,
                    });
                    await postSharedMessage(shareBody);
                    onAskNoteUpdated({ ...activeAskNote, shared: true });
                    onMessagePosted?.();
                    await DpDialog.alert({
                      title: 'Shared with group',
                      message: isCommunity
                        ? `${DP_COMMUNITY_AI.name}'s reply was posted to Community Chat.`
                        : `${DP_COMMUNITY_AI.name}'s reply was posted to the workgroup chat.`,
                      variant: 'success',
                    });
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to share');
                  } finally {
                    setSharing(false);
                  }
                }}
                onAdopt={() => onAdoptAsPost(markdownToPlainText(activeAskNote.reply))}
              />
            ) : null}

            {error && !activeHand && !activeAskNote ? (
              <p className="mt-3 text-sm text-rose-300">{error}</p>
            ) : null}
          </div>
      </>
    </>
  );

  return (
    <>
      {/* Desktop: persistent column */}
      <aside
        className={`hidden flex-col border-l border-violet-900/40 bg-slate-950/80 lg:flex ${
          showRailOnly ? 'w-14 shrink-0' : 'w-full min-w-[18rem] max-w-sm'
        }`}
      >
        {showRailOnly ? collapsedRail : expandedPanel}
      </aside>

      {/* Mobile: bottom sheet overlay */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-[9998] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            aria-label={`Close ${DP_COMMUNITY_AI.name} panel`}
            onClick={onMobileClose}
          />
          <aside className="absolute inset-x-0 bottom-0 flex max-h-[75vh] flex-col rounded-t-xl border-t border-violet-900/50 bg-slate-950 shadow-2xl">
            {expandedPanel}
          </aside>
        </div>
      ) : null}
    </>
  );
}

function HandDetail({
  hand,
  loading,
  sharing,
  error,
  onEnsureOpened,
  onShare,
  onDismiss,
  onAdoptAsPost,
}: {
  hand: HermesHand;
  workgroupId: string;
  workgroupSlug: string;
  dpId: string | null;
  recentMessages: WorkgroupMessage[];
  loading: boolean;
  sharing: boolean;
  error: string | null;
  onHandUpdated: (hand: HermesHand) => void;
  onEnsureOpened: () => Promise<HermesHand>;
  onShare: () => Promise<void>;
  onDismiss: () => Promise<void>;
  onAdoptAsPost: (text: string) => void;
}) {
  const modeLabel = HERMES_MODE_LABELS[hand.mode];

  return (
    <div className="space-y-3">
      <div>
        <UserDateTime value={hand.createdAt} mode="short" className="text-xs text-slate-500" />
        <h3 className="text-sm font-semibold text-violet-200">{modeLabel}</h3>
      </div>

      {hand.status === 'raised' && !hand.fullReply ? (
        <>
          <p className="text-sm text-slate-300">{hand.teaser}</p>
          <button
            type="button"
            disabled={loading}
            onClick={() => void onEnsureOpened()}
            className="rounded-lg bg-violet-800 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {loading ? 'Generating…' : 'Open full reply'}
          </button>
        </>
      ) : null}

      {hand.fullReply ? (
        <div className="prose prose-invert max-w-none text-sm">
          <HermesMarkdown text={hand.fullReply} />
        </div>
      ) : null}

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <footer className="flex flex-wrap gap-2 border-t border-slate-800 pt-3">
        {hand.status !== 'shared' ? (
          <>
            <button
              type="button"
              disabled={sharing || loading}
              onClick={() => void onShare()}
              className="rounded-lg bg-cyan-800 px-3 py-2 text-sm text-white hover:bg-cyan-700 disabled:opacity-50"
            >
              {sharing ? 'Sharing…' : 'Share to thread'}
            </button>
            {hand.fullReply ? (
              <button
                type="button"
                onClick={() => onAdoptAsPost(markdownToPlainText(hand.fullReply || ''))}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                Adopt as my post
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void onDismiss()}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-400 hover:bg-slate-800"
            >
              Keep private
            </button>
          </>
        ) : (
          <span className="rounded-lg border border-emerald-800/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
            Shared with group
          </span>
        )}
      </footer>
    </div>
  );
}

function AskNoteDetail({
  note,
  error,
  sharing,
  onShare,
  onAdopt,
}: {
  note: WorkgroupAskNote;
  error: string | null;
  sharing: boolean;
  onShare: () => Promise<void>;
  onAdopt: () => void;
}) {
  const modeLabel = HERMES_MODE_LABELS[note.mode];

  return (
    <div className="space-y-3">
      <div>
        <UserDateTime value={note.createdAt} mode="short" className="text-xs text-slate-500" />
        <h3 className="text-sm font-semibold text-cyan-200">{modeLabel}</h3>
        {note.question?.trim() ? (
          <p className="text-xs text-slate-400">
            <span className="text-slate-500">You asked: </span>
            {note.question.trim()}
          </p>
        ) : (
          <p className="text-xs text-slate-500">{note.promptLabel}</p>
        )}
      </div>

      <div className="prose prose-invert max-w-none text-sm">
        <HermesMarkdown text={note.reply} />
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <footer className="flex flex-wrap gap-2 border-t border-slate-800 pt-3">
        {!note.shared ? (
          <>
            <button
              type="button"
              disabled={sharing}
              onClick={() => void onShare()}
              className="rounded-lg bg-cyan-800 px-3 py-2 text-sm text-white hover:bg-cyan-700 disabled:opacity-50"
            >
              {sharing ? 'Sharing…' : 'Share to thread'}
            </button>
            <button
              type="button"
              onClick={onAdopt}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              Adopt as my post
            </button>
            <span className="rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-500">
              Kept private
            </span>
          </>
        ) : (
          <span className="rounded-lg border border-emerald-800/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
            Shared with group
          </span>
        )}
      </footer>
    </div>
  );
}
