'use client';

import { useEffect, useState } from 'react';
import type { PhaseTone } from '@/lib/sessions/session-phases';
import { PHASE_TONE } from './phase-tone';

type Props = {
  /** id of the full page header; the compact bar shows once it has scrolled out of view. */
  watchId: string;
  dateLabel: string;
  meetingTitle: string;
  phaseLabel: string | null;
  tone: PhaseTone;
  cta?: { label: string; href: string } | null;
};

/**
 * Compact header that appears under the site header once the page header scrolls away: date, meeting title and
 * current phase, so the reader always knows which meeting they are reading.
 */
export default function SessionStickyHeader({ watchId, dateLabel, meetingTitle, phaseLabel, tone, cta }: Props) {
  const [shown, setShown] = useState(false);
  const [top, setTop] = useState(0);

  useEffect(() => {
    const site = document.querySelector('.site-header');
    const measure = () => setTop(site instanceof HTMLElement ? site.getBoundingClientRect().height : 0);
    measure();
    window.addEventListener('resize', measure);
    const target = document.getElementById(watchId);
    let io: IntersectionObserver | null = null;
    if (target && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(([entry]) => setShown(!entry.isIntersecting && entry.boundingClientRect.top < 0), {
        threshold: 0,
      });
      io.observe(target);
    }
    return () => {
      window.removeEventListener('resize', measure);
      io?.disconnect();
    };
  }, [watchId]);

  const t = PHASE_TONE[tone];
  return (
    <div
      className={`session-sticky-header fixed inset-x-0 z-40 border-b border-slate-700 bg-slate-950/95 shadow-lg shadow-black/30 backdrop-blur transition duration-200 motion-reduce:transition-none ${
        shown ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
      }`}
      style={{ top }}
      aria-hidden={!shown}
      inert={!shown}
    >
      <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-2 sm:px-6">
        <a href="#top" className="min-w-0 flex-1 no-underline">
          <span className="block truncate text-xs font-medium uppercase tracking-wider text-cyan-300">{dateLabel}</span>
          <span className="block truncate text-sm font-semibold text-white sm:text-base">{meetingTitle}</span>
        </a>
        {phaseLabel ? (
          <span className={`hidden shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold sm:inline-block ${t.pill}`}>
            {phaseLabel}
          </span>
        ) : null}
        {cta ? (
          <a href={cta.href} className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold no-underline ${t.button}`}>
            {cta.label}
          </a>
        ) : phaseLabel ? (
          <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold sm:hidden ${t.pill}`}>
            {phaseLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}
