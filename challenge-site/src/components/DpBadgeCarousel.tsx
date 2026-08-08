'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useId, useState } from 'react';
import { bookDiscussHref } from '@/lib/govhub';
import { dpCardImageSrc, dpImageAlt } from '@/lib/dp-images';

export type DpBadgeCarouselItem = {
  id: string;
  name: string;
};

type Props = {
  items: DpBadgeCarouselItem[];
  /** Compact embed for Participate; full for /badges */
  variant?: 'embed' | 'page';
};

export default function DpBadgeCarousel({ items, variant = 'embed' }: Props) {
  const labelId = useId();
  const [index, setIndex] = useState(0);
  const count = items.length;
  const current = items[index] ?? items[0];

  const go = useCallback(
    (delta: number) => {
      if (count === 0) return;
      setIndex((i) => (i + delta + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (count < 2) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, count]);

  if (!current) return null;

  const src = dpCardImageSrc(current.id);
  const dpHref = `/dp/${current.id.toLowerCase()}`;
  const discussHref = bookDiscussHref({ dpId: current.id });
  const isPage = variant === 'page';

  return (
    <div
      className={`rounded-2xl border border-slate-800 bg-slate-950/70 ${isPage ? 'p-6 sm:p-8' : 'p-5'}`}
      role="region"
      aria-roledescription="carousel"
      aria-labelledby={labelId}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p id={labelId} className="text-sm font-medium uppercase tracking-[0.18em] text-cyan-400">
            Badge artwork
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {index + 1} of {count} Desirable Properties
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => go(-1)}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-500"
            aria-label="Previous badge"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-500"
            aria-label="Next badge"
          >
            →
          </button>
        </div>
      </div>

      <div
        className={`mt-5 grid gap-6 ${isPage ? 'md:grid-cols-[minmax(0,22rem)_1fr] md:items-center' : 'sm:grid-cols-[minmax(0,14rem)_1fr] sm:items-center'}`}
      >
        <figure className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          {src ? (
            <Image
              src={src}
              alt={dpImageAlt(current.id, current.name)}
              fill
              className="object-cover"
              sizes={isPage ? '(max-width: 768px) 100vw, 352px' : '(max-width: 640px) 100vw, 224px'}
              priority={index === 0}
            />
          ) : null}
        </figure>

        <div>
          <p className="font-mono text-xs font-semibold text-cyan-300">{current.id}</p>
          <h3 className={`mt-2 font-semibold text-white ${isPage ? 'text-2xl' : 'text-xl'}`}>
            {current.name}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Each Desirable Property has its own badge. Contributors earn the property badge for the
            DP they help refine; role overlays and contribution evidence can be added over time.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href={dpHref}
              className="inline-flex items-center rounded-lg bg-cyan-700 px-3.5 py-2 text-sm font-medium text-white hover:bg-cyan-600"
            >
              View DP page →
            </Link>
            <a
              href={discussHref}
              className="inline-flex items-center rounded-lg border border-slate-700 px-3.5 py-2 text-sm font-medium text-slate-200 hover:border-slate-500"
            >
              Discuss chapter
            </a>
            {isPage ? null : (
              <Link
                href="/badges"
                className="inline-flex items-center rounded-lg px-3 py-2 text-sm text-cyan-300 hover:text-cyan-200"
              >
                All badges →
              </Link>
            )}
          </div>
        </div>
      </div>

      <div
        className="mt-6 flex gap-2 overflow-x-auto pb-1"
        role="tablist"
        aria-label="Jump to a Desirable Property badge"
      >
        {items.map((item, i) => {
          const thumb = dpCardImageSrc(item.id);
          const active = i === index;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={`${item.id}: ${item.name}`}
              onClick={() => setIndex(i)}
              className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-md border transition ${
                active
                  ? 'border-cyan-400 ring-2 ring-cyan-500/40'
                  : 'border-slate-700 opacity-70 hover:opacity-100'
              }`}
            >
              {thumb ? (
                <Image
                  src={thumb}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
