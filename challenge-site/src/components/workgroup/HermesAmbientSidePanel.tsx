'use client';

import { useEffect, useState } from 'react';
import HermesMarkdown from '@/components/HermesMarkdown';
import { DpDialog } from '@/components/DpDialog';
import {
  dismissHermesHand,
  openHermesHand,
  shareHermesHand,
} from '@/lib/hermes-ambient-api';
import { HERMES_MODE_LABELS, type HermesHand } from '@/lib/hermes-ambient-types';
import type { WorkgroupMessage } from '@/lib/workgroup-collab-types';

type Props = {
  hand: HermesHand | null;
  workgroupId: string;
  workgroupSlug: string;
  dpId: string | null;
  recentMessages: WorkgroupMessage[];
  onClose: () => void;
  onUpdated: (hand: HermesHand) => void;
};

export default function HermesAmbientSidePanel({
  hand,
  workgroupId,
  workgroupSlug,
  dpId,
  recentMessages,
  onClose,
  onUpdated,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localHand, setLocalHand] = useState<HermesHand | null>(hand);

  useEffect(() => {
    setLocalHand(hand);
  }, [hand]);

  if (!hand) return null;

  const display = localHand || hand;
  const modeLabel = HERMES_MODE_LABELS[display.mode];

  async function ensureOpened() {
    if (display.fullReply) return;
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
      onUpdated(result.hand);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open note');
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenClick() {
    if (!display.fullReply) {
      await ensureOpened();
    }
  }

  async function handleShare() {
    if (!display.fullReply) {
      await ensureOpened();
    }
    const ok = await DpDialog.confirm({
      title: 'Share with workgroup?',
      message: 'This will post Deepi\'s note to the main chat thread with clear attribution.',
      variant: 'warning',
      confirmLabel: 'Share',
    });
    if (!ok) return;

    setSharing(true);
    setError(null);
    try {
      const result = await shareHermesHand(workgroupId, display.id);
      setLocalHand(result.hand);
      onUpdated(result.hand);
      await DpDialog.alert({
        title: 'Shared with group',
        message: 'Deepi\'s note was posted to the workgroup chat.',
        variant: 'success',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share');
    } finally {
      setSharing(false);
    }
  }

  async function handleDismiss() {
    const ok = await DpDialog.confirm({
      title: 'Dismiss note?',
      message: 'This private Deepi note will be hidden.',
      variant: 'info',
      confirmLabel: 'Dismiss',
    });
    if (!ok) return;

    try {
      await dismissHermesHand(workgroupId, display.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to dismiss');
    }
  }

  return (
    <aside className="fixed inset-y-0 right-0 z-[9999] flex w-full max-w-md flex-col border-l border-violet-900/50 bg-slate-950 shadow-2xl">
      <header className="flex items-start justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-violet-400">Deepi</p>
          <h2 className="text-base font-semibold text-white">{modeLabel}</h2>
          <p className="mt-1 text-xs text-slate-500">Private until you share</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          aria-label="Close panel"
        >
          ✕
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {display.status === 'raised' && !display.fullReply ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-300">{display.teaser}</p>
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleOpenClick()}
              className="rounded-lg bg-violet-800 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {loading ? 'Generating…' : 'Open full reply'}
            </button>
          </div>
        ) : null}

        {display.fullReply ? (
          <div className="prose prose-invert max-w-none text-sm">
            <HermesMarkdown text={display.fullReply} />
          </div>
        ) : null}

        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      </div>

      <footer className="flex flex-wrap gap-2 border-t border-slate-800 px-4 py-3">
        {display.status !== 'shared' ? (
          <button
            type="button"
            disabled={sharing || loading}
            onClick={() => void handleShare()}
            className="rounded-lg bg-cyan-800 px-3 py-2 text-sm text-white hover:bg-cyan-700 disabled:opacity-50"
          >
            {sharing ? 'Sharing…' : 'Share with group'}
          </button>
        ) : (
          <span className="rounded-lg border border-emerald-800/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
            Shared with group
          </span>
        )}
        {display.status !== 'shared' ? (
          <button
            type="button"
            onClick={() => void handleDismiss()}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Dismiss
          </button>
        ) : null}
      </footer>
    </aside>
  );
}
