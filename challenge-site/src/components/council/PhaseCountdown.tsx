'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { formatCountdownParts } from '@/lib/challengeTimeline';

/** Counts down to the next phase boundary; refreshes the page when it is reached. */
export default function PhaseCountdown({ target, label }: { target: string; label: string }) {
  const router = useRouter();
  const targetDate = new Date(target);
  const [parts, setParts] = useState<ReturnType<typeof formatCountdownParts> | null>(null);
  const refreshed = useRef(false);

  useEffect(() => {
    const tick = () => {
      const p = formatCountdownParts(new Date(target), new Date());
      setParts(p);
      if (p.totalMs <= 0 && !refreshed.current) {
        refreshed.current = true;
        // Give Gov Hub a moment past the boundary, then reload the server-rendered phase.
        setTimeout(() => router.refresh(), 3000);
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [target, router]);

  if (Number.isNaN(targetDate.getTime())) return null;
  const units: [number, string][] = parts
    ? [
        [parts.days, 'days'],
        [parts.hours, 'hours'],
        [parts.minutes, 'min'],
        [parts.seconds, 'sec'],
      ]
    : [];

  return (
    <div className="rounded-xl border border-cyan-900/60 bg-cyan-950/20 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.15em] text-cyan-300">{label}</p>
      {parts && parts.totalMs > 0 ? (
        <div className="mt-2 flex gap-3" aria-live="off">
          {units.map(([n, unit]) => (
            <div key={unit} className="min-w-[3.25rem] text-center">
              <div className="text-2xl font-bold tabular-nums text-white">{String(n).padStart(2, '0')}</div>
              <div className="text-[11px] uppercase tracking-wide text-slate-400">{unit}</div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-300">{parts ? 'Moving to the next phase…' : ' '}</p>
      )}
    </div>
  );
}
