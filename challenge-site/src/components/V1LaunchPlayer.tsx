'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Click-to-play YouTube player for the Version 1.0 launch recording.
 *
 * Nothing from YouTube loads until the viewer presses play (or a "play from" timestamp):
 * the facade is a local poster image. After that the video plays from youtube-nocookie.com
 * through the IFrame API, so transcript and chapter timestamps can seek it.
 *
 * Timestamps anywhere on the page opt in with `data-seek="<seconds>"` on a button; one
 * delegated listener here handles them, so the transcript can stay server-rendered.
 */

type YTPlayer = {
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  destroy: () => void;
};

type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      host: string;
      videoId: string;
      width?: string;
      height?: string;
      playerVars: Record<string, string | number>;
      events?: { onReady?: () => void };
    },
  ) => YTPlayer;
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;

function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => {
      apiPromise = null;
      reject(new Error('YouTube player failed to load'));
    };
    document.head.appendChild(script);
  });
  return apiPromise;
}

export default function V1LaunchPlayer({
  videoId,
  title,
  poster,
  durationLabel,
}: {
  videoId: string;
  title: string;
  poster: string;
  durationLabel: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const readyRef = useRef(false);
  const pendingSeek = useRef<number | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  const start = useCallback(
    (at = 0) => {
      if (playerRef.current) {
        if (readyRef.current) {
          playerRef.current.seekTo(at, true);
          playerRef.current.playVideo();
        } else {
          pendingSeek.current = at;
        }
        return;
      }
      setState('loading');
      pendingSeek.current = null;
      loadYouTubeApi()
        .then((YT) => {
          if (!mountRef.current || playerRef.current) return;
          // YouTube replaces its target element with an iframe, so give it a node React does not own.
          const target = document.createElement('div');
          mountRef.current.appendChild(target);
          playerRef.current = new YT.Player(target, {
            host: 'https://www.youtube-nocookie.com',
            videoId,
            width: '100%',
            height: '100%',
            playerVars: { autoplay: 1, start: Math.floor(at), rel: 0, playsinline: 1 },
            events: {
              onReady: () => {
                readyRef.current = true;
                setState('ready');
                if (pendingSeek.current !== null) {
                  playerRef.current?.seekTo(pendingSeek.current, true);
                  pendingSeek.current = null;
                }
                playerRef.current?.playVideo();
              },
            },
          });
        })
        .catch(() => setState('error'));
    },
    [videoId],
  );

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-seek]');
      if (!target) return;
      const at = Number(target.dataset.seek);
      if (!Number.isFinite(at)) return;
      event.preventDefault();
      start(at);
      const wrap = wrapRef.current;
      if (wrap) {
        const rect = wrap.getBoundingClientRect();
        if (rect.top < 0 || rect.bottom > window.innerHeight) {
          wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [start]);

  useEffect(
    () => () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    },
    [],
  );

  const showFacade = state !== 'ready';

  return (
    <div ref={wrapRef} className="scroll-mt-24">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-800 bg-black">
        <div ref={mountRef} className="absolute inset-0 h-full w-full [&_iframe]:h-full [&_iframe]:w-full" />
        {showFacade ? (
          <button
            type="button"
            onClick={() => start(0)}
            disabled={state === 'loading'}
            className="group absolute inset-0 block h-full w-full cursor-pointer text-left"
            aria-label={`Play video: ${title} (${durationLabel})`}
          >
            <Image
              src={poster}
              alt=""
              fill
              priority
              sizes="(min-width: 1024px) 896px, 100vw"
              className="object-cover"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
            <span className="absolute left-1/2 top-1/2 flex h-16 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-red-600/90 shadow-lg transition group-hover:bg-red-600 group-focus-visible:ring-4 group-focus-visible:ring-cyan-300 sm:h-20 sm:w-28">
              {state === 'loading' ? (
                <span className="h-7 w-7 animate-spin rounded-full border-4 border-white/40 border-t-white" />
              ) : (
                <svg viewBox="0 0 24 24" className="h-8 w-8 fill-white sm:h-10 sm:w-10" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </span>
            <span className="absolute bottom-3 right-3 rounded bg-black/80 px-2 py-0.5 text-xs font-medium text-white">
              {durationLabel}
            </span>
          </button>
        ) : null}
      </div>
      {state === 'error' ? (
        <p className="mt-3 text-sm text-amber-300">
          The player could not load here.{' '}
          <a
            href={`https://www.youtube.com/watch?v=${videoId}`}
            className="underline hover:text-amber-200"
            target="_blank"
            rel="noopener noreferrer"
          >
            Watch on YouTube
          </a>
          .
        </p>
      ) : (
        <p className="mt-3 text-xs text-slate-500">
          The video loads from YouTube (privacy-enhanced mode) only when you press play.{' '}
          <a
            href={`https://youtu.be/${videoId}`}
            className="text-cyan-300 hover:text-cyan-200"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open on YouTube
          </a>
        </p>
      )}
    </div>
  );
}

