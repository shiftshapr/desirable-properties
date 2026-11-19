'use client';

import { useState } from 'react';
import { youtubeEmbedUrl, youtubeThumbUrl, type V1PromoVideo as Video } from '@/data/v1-promo';

/**
 * Click-to-play YouTube facade. Only a thumbnail (lazy-loaded) shows until the viewer presses play;
 * then the video plays from youtube-nocookie.com. Renders nothing when the video is not public yet.
 */
export default function V1PromoVideo({ video, className = '' }: { video: Video; className?: string }) {
  const [playing, setPlaying] = useState(false);
  if (!video.youtubeId) return null;
  const id = video.youtubeId;
  const aspect = video.aspect === '9:16' ? 'aspect-[9/16]' : 'aspect-video';

  return (
    <figure className={className}>
      <div className={`relative w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950 ${aspect}`}>
        {playing ? (
          <iframe
            src={youtubeEmbedUrl(id)}
            title={video.title}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={`Play video: ${video.title} (${video.durationLabel})`}
            className="group absolute inset-0 h-full w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={youtubeThumbUrl(id)}
              alt=""
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="absolute inset-0 h-full w-full object-cover opacity-80 transition group-hover:opacity-100"
            />
            <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500/90 text-slate-950 shadow-lg transition group-hover:bg-cyan-400">
                <svg viewBox="0 0 24 24" className="ml-1 h-6 w-6" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </span>
            <span
              className="absolute bottom-2 right-2 rounded bg-slate-950/80 px-1.5 py-0.5 text-xs font-medium text-slate-100"
              aria-hidden="true"
            >
              {video.durationLabel}
            </span>
          </button>
        )}
      </div>
      <figcaption className="mt-2 text-sm text-slate-300">
        {video.title}{' '}
        {video.watchUrl ? (
          <a href={video.watchUrl} className="text-cyan-300 hover:text-cyan-200" target="_blank" rel="noopener noreferrer">
            Watch on YouTube<span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : null}
      </figcaption>
    </figure>
  );
}
