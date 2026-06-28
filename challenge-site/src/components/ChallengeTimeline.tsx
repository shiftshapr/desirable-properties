'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { EnrichedMilestone } from '@/lib/challengeTimeline';

type Props = {
  activeAndUpcoming: EnrichedMilestone[];
  past: EnrichedMilestone[];
};

const STATUS_STYLES: Record<
  EnrichedMilestone['status'],
  { dot: string; ring: string; badge: string; badgeText: string }
> = {
  past: {
    dot: 'bg-slate-600',
    ring: 'border-slate-700',
    badge: 'bg-slate-800',
    badgeText: 'text-slate-400',
  },
  current: {
    dot: 'bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.5)]',
    ring: 'border-cyan-500/60',
    badge: 'bg-cyan-950',
    badgeText: 'text-cyan-300',
  },
  upcoming: {
    dot: 'bg-violet-500',
    ring: 'border-violet-700/60',
    badge: 'bg-violet-950',
    badgeText: 'text-violet-300',
  },
};

function MilestoneLink({ milestone }: { milestone: EnrichedMilestone }) {
  if (!milestone.href) return null;
  const isExternal = milestone.href.startsWith('http');
  const className =
    'mt-3 inline-flex items-center text-sm font-medium text-cyan-300 hover:text-cyan-200';

  if (isExternal) {
    return (
      <a href={milestone.href} target="_blank" rel="noopener noreferrer" className={className}>
        {milestone.linkLabel ?? 'Learn more'} →
      </a>
    );
  }
  return (
    <Link href={milestone.href} className={className}>
      {milestone.linkLabel ?? 'Learn more'} →
    </Link>
  );
}

function MilestoneItem({ milestone }: { milestone: EnrichedMilestone }) {
  const styles = STATUS_STYLES[milestone.status];
  const statusLabel =
    milestone.status === 'current'
      ? 'Now'
      : milestone.status === 'upcoming'
        ? 'Upcoming'
        : 'Completed';

  return (
    <li className="relative flex gap-4 pb-10 last:pb-0">
      <div className="flex flex-col items-center">
        <div
          className={`z-10 h-3 w-3 shrink-0 rounded-full ${styles.dot} ring-4 ring-slate-950`}
          aria-hidden
        />
        <div className="mt-1 w-px flex-1 bg-slate-800 last:hidden" aria-hidden />
      </div>
      <div
        className={`min-w-0 flex-1 rounded-xl border ${styles.ring} bg-slate-900/50 p-5 ${
          milestone.status === 'current' ? 'shadow-lg shadow-cyan-950/20' : ''
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles.badge} ${styles.badgeText}`}
          >
            {statusLabel}
          </span>
          <time className="text-sm text-slate-500">{milestone.dateLabel}</time>
        </div>
        <h3 className="mt-2 text-lg font-semibold text-white">{milestone.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{milestone.description}</p>
        <MilestoneLink milestone={milestone} />
      </div>
    </li>
  );
}

export default function ChallengeTimeline({ activeAndUpcoming, past }: Props) {
  const [showPast, setShowPast] = useState(false);

  return (
    <div>
      <ul className="relative">
        {activeAndUpcoming.map((m) => (
          <MilestoneItem key={m.id} milestone={m} />
        ))}
      </ul>

      {past.length > 0 && (
        <div className="mt-6 border-t border-slate-800 pt-6">
          <button
            type="button"
            onClick={() => setShowPast((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-900/40 px-4 py-3 text-left text-sm font-medium text-slate-200 hover:border-slate-600 hover:bg-slate-900/60"
            aria-expanded={showPast}
          >
            <span>
              {showPast ? 'Hide' : 'Show'} journey so far
              <span className="ml-2 font-normal text-slate-500">
                ({past.length} milestone{past.length === 1 ? '' : 's'})
              </span>
            </span>
            <span className="text-slate-500" aria-hidden>
              {showPast ? '▲' : '▼'}
            </span>
          </button>

          {showPast && (
            <ul className="relative mt-6">
              {past.map((m) => (
                <MilestoneItem key={m.id} milestone={m} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
