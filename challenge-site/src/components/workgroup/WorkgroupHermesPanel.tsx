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
import { HERMES_MODE_LABELS, type HermesHand } from '@/lib/hermes-ambient-types';
import { markdownToPlainText } from '@/lib/markdown-to-plain-text';
import { postWorkgroupMessage } from '@/lib/workgroup-collab-api';
import type { WorkgroupAskNote } from '@/lib/workgroup-hermes-panel-types';
import type { WorkgroupMessage } from '@/lib/workgroup-collab-types';

type Props = {
  workgroupId: string;
  workgroupSlug: string;
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

export default function WorkgroupHermesPanel({
  workgroupId,
  workgroupSlug,
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

  const panelBody = (
    <>
      <header className="flex items-start justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-violet-400">Hermes</p>
            <HermesExperimentalBadge />
          </div>
          <h2 className="text-base font-semibold text-white">Private panel</h2>
          <p className="mt-1 text-xs text-slate-500">Raised hands &amp; Ask Hermes replies</p>
        </div>
        <div className="flex items-center gap-1">
          {onOpenHermesInstructions ? (
            <button
              type="button"
              onClick={onOpenHermesInstructions}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-600 text-xs font-bold text-slate-300 hover:border-slate-500 hover:text-white"
              aria-label="How Hermes works"
              title="How Hermes works"
            >
              ?
            </button>
          ) : null}
          {onToggleCollapse ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:inline-flex"
              aria-label={collapsed ? 'Expand panel' : 'Collapse panel'}
            >
              {collapsed ? '◀' : '▶'}
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

      {!collapsed ? (
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
                Hermes notes appear here – raised hands after messages, or replies from Ask Hermes.
                Nothing posts until you choose.
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
                    const result = await openHermesHand(workgroupId, display.id, {
                      workgroupSlug,
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
                    hand = (await openHermesHand(workgroupId, hand.id, {
                      workgroupSlug,
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
                    title: 'Share with workgroup?',
                    message: "This will post Hermes's note to the main chat thread with clear attribution.",
                    variant: 'warning',
                    confirmLabel: 'Share',
                  });
                  if (!ok) return;
                  setSharing(true);
                  setError(null);
                  try {
                    const result = await shareHermesHand(workgroupId, hand.id);
                    setLocalHand(result.hand);
                    onHandUpdated(result.hand);
                    onMessagePosted?.();
                    await DpDialog.alert({
                      title: 'Shared with group',
                      message: "Hermes's note was posted to the workgroup chat.",
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
                    message: 'This private Hermes note will be hidden.',
                    variant: 'info',
                    confirmLabel: 'Dismiss',
                  });
                  if (!ok) return;
                  try {
                    await dismissHermesHand(workgroupId, activeHand.id);
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
                  const ok = await DpDialog.confirm({
                    title: 'Share with workgroup?',
                    message: "This will post Hermes's reply to the main chat thread with clear attribution.",
                    variant: 'warning',
                    confirmLabel: 'Share',
                  });
                  if (!ok) return;
                  setSharing(true);
                  setError(null);
                  try {
                    const modeLabel = HERMES_MODE_LABELS[activeAskNote.mode];
                    const shareBody = `✋ *Hermes (${modeLabel})*\n\n${activeAskNote.reply}`;
                    await postWorkgroupMessage(workgroupId, shareBody);
                    onAskNoteUpdated({ ...activeAskNote, shared: true });
                    onMessagePosted?.();
                    await DpDialog.alert({
                      title: 'Shared with group',
                      message: "Hermes's reply was posted to the workgroup chat.",
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
      ) : (
        <div className="flex flex-1 items-center justify-center px-2 py-8">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="text-xs text-violet-400 hover:text-violet-300"
            aria-label="Expand Hermes panel"
          >
            Hermes
          </button>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Desktop: persistent column */}
      <aside
        className={`hidden flex-col border-l border-violet-900/40 bg-slate-950/80 lg:flex ${
          collapsed ? 'w-12' : 'w-full min-w-[18rem] max-w-sm'
        }`}
      >
        {panelBody}
      </aside>

      {/* Mobile: bottom sheet overlay */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-[9998] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            aria-label="Close Hermes panel"
            onClick={onMobileClose}
          />
          <aside className="absolute inset-x-0 bottom-0 flex max-h-[75vh] flex-col rounded-t-xl border-t border-violet-900/50 bg-slate-950 shadow-2xl">
            {panelBody}
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
        <p className="text-xs text-slate-500">{note.promptLabel}</p>
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
