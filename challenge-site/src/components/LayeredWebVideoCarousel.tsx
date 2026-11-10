'use client';

import { useRef } from 'react';
import type { LayeredWebVideo } from '@/data/layered-web-videos';

/** A row of vertical videos that scrolls sideways; one plays at a time. */
export default function LayeredWebVideoCarousel({ videos }: { videos: LayeredWebVideo[] }) {
  const track = useRef<HTMLUListElement>(null);

  function scroll(dir: 1 | -1) {
    const el = track.current;
    const card = el?.querySelector('li');
    if (!el || !card) return;
    el.scrollBy({ left: dir * (card.getBoundingClientRect().width + 16), behavior: 'smooth' });
  }

  function onPlay(e: React.SyntheticEvent<HTMLVideoElement>) {
    track.current?.querySelectorAll('video').forEach((v) => {
      if (v !== e.currentTarget) v.pause();
    });
  }

  if (!videos.length) return null;
  return (
    <div className="relative">
      <ul
        ref={track}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:thin]"
        aria-label="The Layered Web videos"
      >
        {videos.map((v) => (
          <li key={v.slug} className="w-[260px] shrink-0 snap-start sm:w-[300px]">
            <video
              className="aspect-[9/16] w-full rounded-xl border border-slate-800 bg-slate-950 object-cover"
              src={v.vertical}
              poster={v.poster}
              controls
              playsInline
              preload="none"
              onPlay={onPlay}
            />
            <h3 className="mt-3 text-base font-semibold text-white">{v.title}</h3>
            <p className="mt-1 text-sm text-slate-400">{v.blurb}</p>
            <a href={v.wide} download className="mt-2 inline-block text-xs text-cyan-300 hover:text-cyan-200">
              Download widescreen (16:9)
            </a>
          </li>
        ))}
      </ul>
      {videos.length > 1 ? (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => scroll(-1)}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:border-cyan-600"
            aria-label="Previous videos"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:border-cyan-600"
            aria-label="More videos"
          >
            →
          </button>
        </div>
      ) : null}
    </div>
  );
}
