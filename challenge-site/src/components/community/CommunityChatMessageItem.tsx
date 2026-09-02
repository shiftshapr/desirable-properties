'use client';

import { useState } from 'react';
import HermesAmbientHandBadge from '@/components/workgroup/HermesAmbientHandBadge';
import WorkgroupMessageBody from '@/components/workgroup/WorkgroupMessageBody';
import UserDateTime from '@/components/UserDateTime';
import type { HermesHand } from '@/lib/hermes-ambient-types';
import type { WorkgroupMessage } from '@/lib/workgroup-collab-types';

type Props = {
  message: WorkgroupMessage;
  hands: HermesHand[];
  canPrompt: boolean;
  canEdit: boolean;
  editing: boolean;
  editBusy: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (body: string) => Promise<void>;
  onOpenHand: (hand: HermesHand) => void;
};

export default function CommunityChatMessageItem({
  message,
  hands,
  canPrompt,
  canEdit,
  editing,
  editBusy,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onOpenHand,
}: Props) {
  const [editText, setEditText] = useState(message.body);

  function startEdit() {
    setEditText(message.body);
    onStartEdit();
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = editText.trim();
    if (!trimmed || editBusy) return;
    await onSaveEdit(trimmed);
  }

  return (
    <article className="group rounded-lg border border-slate-800/80 bg-slate-950/40 px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-cyan-200">{message.author_name || 'Member'}</span>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 text-xs text-slate-500">
          {message.edited_at ? (
            <span className="inline-flex items-center gap-1 text-slate-400">
              <span>Edited</span>
              <UserDateTime value={message.edited_at} mode="short" />
            </span>
          ) : null}
          <UserDateTime value={message.created_at} mode="short" />
          {canEdit && !editing ? (
            <button
              type="button"
              onClick={startEdit}
              className="rounded px-1.5 py-0.5 text-slate-400 opacity-0 transition-opacity hover:bg-slate-800 hover:text-cyan-300 group-hover:opacity-100 focus:opacity-100"
            >
              Edit
            </button>
          ) : null}
        </div>
      </div>

      {editing ? (
        <form onSubmit={(e) => void handleSave(e)} className="mt-2 space-y-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={4}
            maxLength={8000}
            disabled={editBusy}
            className="w-full resize-y rounded-lg border border-cyan-700/50 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-cyan-600 focus:outline-none disabled:opacity-60"
            aria-label="Edit message"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={editBusy || !editText.trim()}
              className="rounded-md bg-cyan-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {editBusy ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              disabled={editBusy}
              onClick={onCancelEdit}
              className="rounded-md px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <WorkgroupMessageBody body={message.body} />
      )}

      {canPrompt
        ? hands.map((hand) => (
            <HermesAmbientHandBadge key={hand.id} hand={hand} onOpen={onOpenHand} />
          ))
        : null}
    </article>
  );
}
