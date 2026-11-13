'use client';

import { useEffect, useRef, useState } from 'react';
import { V1_LAUNCH_REGISTER_URL, V1_PDF_HREF } from '@/lib/dp-v1-release';
import { useV1Phase } from '@/components/v1/V1PhaseText';

const READ_ONLINE = 'https://book.desirableproperties.org/';
const SHARE_URL = 'https://desirableproperties.org/v1';
const SHARE_TEXT =
  'The Layered Web, Version 1.0: twenty-four Desirable Properties for a trustworthy layer above the web, written in the open.';

function ShareButton() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const onClick = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator && window.matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ title: 'The Layered Web, Version 1.0', text: SHARE_TEXT, url: SHARE_URL });
        return;
      } catch {
        /* fall through to the menu */
      }
    }
    setOpen((v) => !v);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  };
  const u = encodeURIComponent(SHARE_URL);
  const t = encodeURIComponent(SHARE_TEXT);
  const links: Array<[string, string]> = [
    ['LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${u}`],
    ['X', `https://twitter.com/intent/tweet?url=${u}&text=${t}`],
    ['Bluesky', `https://bsky.app/intent/compose?text=${t}%20${u}`],
    ['Email', `mailto:?subject=${encodeURIComponent('The Layered Web, Version 1.0')}&body=${t}%0A%0A${u}`],
  ];
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={onClick}
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-5 py-3 text-sm font-semibold text-white hover:border-slate-400 hover:bg-white/5"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Share
      </button>
      {open ? (
        <div className="absolute left-0 z-20 mt-2 w-56 rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-2xl shadow-black/60">
          <button type="button" onClick={copy} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-800">
            {copied ? 'Link copied' : 'Copy link'}
          </button>
          {links.map(([label, href]) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="block rounded-lg px-3 py-2 text-sm text-slate-100 hover:bg-slate-800">
              {label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * /v1 hero, in the style of a major report launch: the cover large, Download / Read online / Share up front.
 * Before 10am PT on Nov 13 the first button registers for the launch instead of downloading.
 */
export default function V1ReportHero() {
  const phase = useV1Phase();
  const before = phase === 'before';
  return (
    <section
      aria-labelledby="v1-report-title"
      className="relative overflow-hidden border-b border-amber-400/30 bg-[radial-gradient(ellipse_at_70%_40%,rgba(217,164,65,0.18),transparent_55%),linear-gradient(180deg,#05070d,#0b1120)]"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:py-20">
        <div className="order-2 lg:order-1">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">
            {before ? 'New report · launching today, 10–11 AM PT' : 'New report · Version 1.0 · November 13, 2026'}
          </p>
          <h1 id="v1-report-title" className="mt-4 text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
            The Layered Web
          </h1>
          <p className="mt-2 text-xl font-semibold text-amber-200 sm:text-2xl">The Desirable Properties of a Meta-Layer</p>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-200">
            Twenty-four properties that a trustworthy layer above the web must have, written in the open by hundreds of
            contributors over two years and decided, line by line, in public.
          </p>
          <p className="mt-4 max-w-xl leading-relaxed text-slate-300">
            It is the first step from principle to working system: the properties become testable requirements, the
            requirements become architecture decisions, and those decisions build the Overweb. And it stays alive:
            read and discuss every page online, propose changes for Version 1.1, and find its chapters preserved on
            Bitcoin.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {before ? (
              <a
                href={V1_LAUNCH_REGISTER_URL}
                className="inline-flex items-center rounded-lg bg-amber-400 px-6 py-3.5 text-base font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-300"
              >
                Join the launch: register free
              </a>
            ) : (
              <a
                href={V1_PDF_HREF}
                download
                className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-6 py-3.5 text-base font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-300"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M12 3v12m0 0 5-5m-5 5-5-5M4 19h16" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Download the report
              </a>
            )}
            <a
              href={READ_ONLINE}
              className="inline-flex items-center rounded-lg bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15"
            >
              Read online →
            </a>
            <ShareButton />
          </div>
          <p className="mt-5 text-sm text-slate-400">
            {before ? 'PDF available from 10 AM PT · ' : 'PDF · 807 pages · 16 MB · '}Foreword by Vint Cerf · CC BY 4.0
          </p>
        </div>
        <div className="order-1 flex justify-center lg:order-2">
          <a href={before ? READ_ONLINE : V1_PDF_HREF} className="group relative block w-72 sm:w-96 lg:w-[30rem]" aria-label="The Layered Web, Version 1.0">
            <span aria-hidden="true" className="absolute inset-10 rounded-full bg-amber-400/20 blur-3xl" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/v1/book-3d-600.webp"
              srcSet="/images/v1/book-3d-600.webp 600w, /images/v1/book-3d-1200.webp 1200w"
              sizes="(min-width: 1024px) 480px, (min-width: 640px) 384px, 288px"
              width={600}
              height={600}
              alt="The Layered Web: The Desirable Properties of a Meta-Layer, Version 1.0, foreword by Vint Cerf"
              className="relative drop-shadow-[0_30px_40px_rgba(0,0,0,0.7)] transition-transform duration-500 group-hover:-translate-y-1"
            />
          </a>
        </div>
      </div>
    </section>
  );
}
