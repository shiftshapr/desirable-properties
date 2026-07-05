'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { challengeMeta } from '@/lib/challengeTimeline';
import { useChallengeCountdown } from '@/hooks/useChallengeCountdown';

const LUMA_WAITLIST_URL = 'https://luma.com/wfi1z9lv';
const REVEAL_DELAY_MS = 5000;

type Props = {
  initialNow?: string;
  className?: string;
};

export default function WorkgroupCountdownOverlay({ initialNow, className = '' }: Props) {
  const parts = useChallengeCountdown(initialNow, 60_000);
  const [revealed, setRevealed] = useState(false);
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setRevealed(true), REVEAL_DELAY_MS);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!showWaitlist) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowWaitlist(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showWaitlist]);

  const clearHoverTimers = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
  }, []);

  const handleMouseEnter = () => {
    clearHoverTimers();
    hoverTimer.current = setTimeout(() => setShowWaitlist(true), 280);
  };

  const handleMouseLeave = () => {
    clearHoverTimers();
    leaveTimer.current = setTimeout(() => setShowWaitlist(false), 320);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized || normalized.indexOf('@') < 1) return;
    setSubmitted(true);
    window.open(LUMA_WAITLIST_URL, '_blank', 'noopener,noreferrer');
  };

  if (!parts) return null;

  return (
    <>
      <div
        className={`group relative cursor-pointer select-none ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => setShowWaitlist(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setShowWaitlist(true);
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Countdown to book launch – hover or tap to join the waitlist"
      >
        <div
          className={`relative overflow-hidden rounded-xl border border-violet-500/40 bg-gradient-to-br from-violet-950/80 via-slate-950/90 to-slate-900/80 px-4 py-5 shadow-[0_0_32px_rgba(139,92,246,0.25)] transition-all duration-700 ease-out ${
            revealed ? 'translate-x-0 opacity-100' : '-translate-x-3 opacity-0'
          }`}
        >
          <div
            className="pointer-events-none absolute -inset-px rounded-xl bg-gradient-to-br from-violet-400/20 via-transparent to-cyan-400/10 opacity-60"
            aria-hidden
          />
          <div className="relative">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300/90">
              Launch
            </p>
            <p
              className="mt-1 font-mono text-5xl font-bold tabular-nums leading-none text-white drop-shadow-[0_0_12px_rgba(167,139,250,0.5)]"
              aria-live="polite"
            >
              {parts.days}
            </p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-violet-300/80">
              days
            </p>
            <div className="mt-3 flex items-baseline gap-3 border-t border-violet-800/40 pt-3">
              <p className="font-mono text-sm tabular-nums text-violet-100/90">
                <span className="text-base font-semibold text-white">{parts.hours}</span>
                <span className="ml-0.5 text-[10px] uppercase text-violet-400/80">hr</span>
              </p>
              <p className="font-mono text-sm tabular-nums text-violet-100/90">
                <span className="text-base font-semibold text-white">{parts.minutes}</span>
                <span className="ml-0.5 text-[10px] uppercase text-violet-400/80">min</span>
              </p>
            </div>
            <p className="mt-3 text-[10px] leading-snug text-slate-400 group-hover:text-violet-200/90">
              Hover to join the waitlist
            </p>
          </div>
        </div>
      </div>

      {showWaitlist && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="waitlist-modal-title"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Close"
            onClick={() => setShowWaitlist(false)}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-violet-700/50 bg-slate-900 shadow-[0_0_48px_rgba(139,92,246,0.35)]">
            <div className="border-b border-violet-900/50 bg-gradient-to-r from-violet-950/60 to-slate-900 px-6 py-4">
              <h2 id="waitlist-modal-title" className="text-lg font-semibold text-white">
                Join the waitlist
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {challengeMeta.book_launch_title} · September 18, 2026
              </p>
            </div>

            <div className="space-y-4 px-6 py-5">
              <p className="text-sm leading-relaxed text-slate-300">
                Be first to know when the Desirable Properties book and Digital Monument launch,
                and reserve your spot at the Meta-Layer Summit on launch day.
              </p>

              {submitted ? (
                <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
                  Thanks! Complete your RSVP on Luma to secure your spot.
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label htmlFor="waitlist-email" className="mb-1 block text-sm text-slate-400">
                      Email address
                    </label>
                    <input
                      id="waitlist-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-950/40 hover:from-violet-500 hover:to-cyan-500"
                  >
                    Join waitlist &amp; RSVP
                  </button>
                </form>
              )}

              <p className="text-center text-xs text-slate-500">
                Or{' '}
                <a
                  href={LUMA_WAITLIST_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-300 hover:text-cyan-200"
                >
                  RSVP directly on Luma
                </a>
              </p>
            </div>

            <div className="border-t border-slate-800 px-6 py-3 text-right">
              <button
                type="button"
                onClick={() => setShowWaitlist(false)}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
