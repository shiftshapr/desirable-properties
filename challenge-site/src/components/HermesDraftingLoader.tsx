'use client';

import { useEffect, useState } from 'react';

export const DEEPI_DRAFTING_GIF = '/images/deepi-drafting.gif';

interface HermesDraftingLoaderProps {
  label?: string;
  compact?: boolean;
}

export default function HermesDraftingLoader({
  label = 'Drafting your DP contribution',
  compact = false,
}: HermesDraftingLoaderProps) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(() => {
      setSeconds(Math.floor((Date.now() - started) / 1000));
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  const size = compact ? 28 : 40;
  const detail = seconds < 2
    ? 'Opening the review panel'
    : `${seconds}s – still working`;

  return (
    <div
      className={`flex items-center gap-3 ${compact ? '' : 'py-1'}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <img
        src={DEEPI_DRAFTING_GIF}
        alt=""
        width={size}
        height={size}
        className={compact ? 'h-7 w-7' : 'h-10 w-10'}
      />
      <div>
        <p className={compact ? 'text-xs font-medium text-amber-100' : 'text-sm font-medium text-amber-100'}>
          {label}
        </p>
        <p className="text-[11px] text-slate-400">{detail}</p>
      </div>
    </div>
  );
}
