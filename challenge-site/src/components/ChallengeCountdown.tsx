'use client';

import { useEffect, useState } from 'react';
import {
  challengeMeta,
  formatCountdownParts,
  getBookLaunchDate,
  getCountdownTarget,
} from '@/lib/challengeTimeline';

type Props = {
  /** ISO string from server render so first paint matches */
  initialNow?: string;
};

export default function ChallengeCountdown({ initialNow }: Props) {
  const [parts, setParts] = useState<ReturnType<typeof formatCountdownParts> | null>(() => {
    const now = initialNow ? new Date(initialNow) : new Date();
    const target = getCountdownTarget(now);
    if (!target) return null;
    return formatCountdownParts(target, now);
  });

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const target = getCountdownTarget(now);
      if (!target) {
        setParts(null);
        return;
      }
      setParts(formatCountdownParts(target, now));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!parts) {
    return (
      <div className="rounded-xl border border-violet-800/50 bg-violet-950/30 p-6 text-center">
        <p className="text-lg font-semibold text-violet-200">
          {challengeMeta.book_launch_title} is live
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Explore the online book and Ordinal edition below.
        </p>
      </div>
    );
  }

  const launch = getBookLaunchDate();
  const launchLabel = launch.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const units = [
    { value: parts.days, label: 'Days' },
    { value: parts.hours, label: 'Hours' },
    { value: parts.minutes, label: 'Min' },
    { value: parts.seconds, label: 'Sec' },
  ];

  return (
    <div className="rounded-xl border border-violet-800/50 bg-gradient-to-br from-violet-950/40 to-slate-900/60 p-6">
      <p className="text-center text-sm font-medium uppercase tracking-[0.15em] text-violet-300">
        Countdown to launch
      </p>
      <p className="mt-2 text-center text-lg font-semibold text-white">
        {challengeMeta.book_launch_title}
      </p>
      <p className="mt-1 text-center text-sm text-slate-400">{launchLabel}</p>
      <div className="mt-6 grid grid-cols-4 gap-3">
        {units.map(({ value, label }) => (
          <div
            key={label}
            className="rounded-lg border border-slate-700/80 bg-slate-950/60 px-2 py-3 text-center"
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
