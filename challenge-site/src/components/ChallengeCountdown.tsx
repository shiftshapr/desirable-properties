'use client';

import {
  getCountdownMilestone,
} from '@/lib/challengeTimeline';
import { useChallengeCountdown } from '@/hooks/useChallengeCountdown';

type Props = {
  /** ISO string from server render so first paint matches */
  initialNow?: string;
};

export default function ChallengeCountdown({ initialNow }: Props) {
  const parts = useChallengeCountdown(initialNow, 1000);
  const milestone = parts ? getCountdownMilestone(new Date()) : null;

  if (!parts || !milestone) {
    return (
      <div className="rounded-xl border border-violet-800/50 bg-violet-950/30 p-6 text-center">
        <p className="text-lg font-semibold text-violet-200">
          Desirable Properties milestones are live
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Explore the Community Review Draft and Version 1.0 release below.
        </p>
      </div>
    );
  }

  const launchLabel = milestone.target.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Los_Angeles',
  });

  const launchTime = milestone.target.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    timeZone: 'America/Los_Angeles',
  });

  const units = [
    { value: parts.days, label: 'Days' },
    { value: parts.hours, label: 'Hours' },
    { value: parts.minutes, label: 'Min' },
    { value: parts.seconds, label: 'Sec' },
  ];

  return (
    <div className="rounded-xl border border-violet-800/50 bg-gradient-to-br from-violet-950/40 to-slate-900/60 p-4 sm:p-6">
      <p className="text-center text-sm font-medium uppercase tracking-[0.15em] text-violet-300">
        Countdown to milestone
      </p>
      <p className="mt-2 text-center text-lg font-semibold text-white">
        {milestone.title}
      </p>
      <p className="mt-1 text-center text-sm text-slate-400">
        {launchLabel} · {launchTime}
      </p>
      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {units.map(({ value, label }) => (
          <div
            key={label}
            className="rounded-lg border border-slate-700/80 bg-slate-950/60 px-2 py-2.5 text-center sm:py-3"
          >
            <span className="block font-mono text-2xl font-bold tabular-nums text-white sm:text-3xl">
              {String(value).padStart(2, '0')}
            </span>
            <span className="mt-1 block text-[10px] uppercase tracking-wide text-slate-500 sm:text-xs">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
