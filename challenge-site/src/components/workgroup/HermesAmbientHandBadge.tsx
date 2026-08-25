'use client';

import { HERMES_MODE_LABELS, type HermesHand } from '@/lib/hermes-ambient-types';

const MODE_BADGE: Record<HermesHand['mode'], string> = {
  observer: 'bg-slate-700 text-slate-200',
  facilitator: 'bg-cyan-900/60 text-cyan-200',
  devils_advocate: 'bg-amber-900/50 text-amber-200',
};

type Props = {
  hand: HermesHand;
  onOpen: (hand: HermesHand) => void;
  compact?: boolean;
};

export default function HermesAmbientHandBadge({ hand, onOpen, compact }: Props) {
  if (hand.status === 'dismissed') return null;

  const modeLabel = HERMES_MODE_LABELS[hand.mode];
  const badgeClass = MODE_BADGE[hand.mode];

  return (
    <button
      type="button"
      onClick={() => onOpen(hand)}
      className={`mt-2 flex w-full items-start gap-2 rounded-lg border border-violet-800/50 bg-violet-950/30 px-3 py-2 text-left transition hover:border-violet-600/60 hover:bg-violet-950/50 ${
        compact ? 'text-xs' : 'text-sm'
      }`}
      aria-label={`Open Deepi ${modeLabel} note`}
    >
      <span className="text-base leading-none" aria-hidden>
        ✋
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${badgeClass}`}>
            {modeLabel}
          </span>
          {hand.status === 'shared' ? (
            <span className="text-[10px] text-emerald-400">Shared with group</span>
          ) : (
            <span className="text-[10px] text-violet-300">Private note</span>
          )}
        </span>
        {!compact && hand.teaser ? (
          <span className="mt-1 block text-slate-300">{hand.teaser}</span>
        ) : null}
      </span>
    </button>
  );
}
