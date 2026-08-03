'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { siteKeyFromPathname } from '@/lib/dp-site-key';

const DISMISS_PREFIX = 'dp-site-modal-dismissed:';

type SiteModal = {
  id: string;
  title: string;
  message: string;
  question: string | null;
  videoUrl: string | null;
  variant: string;
};

const VARIANT_STYLES: Record<string, { border: string; icon: string; badge: string }> = {
  info: {
    border: 'border-cyan-700/50',
    icon: 'ℹ',
    badge: 'bg-cyan-950/60 text-cyan-200',
  },
  success: {
    border: 'border-emerald-700/50',
    icon: '✓',
    badge: 'bg-emerald-950/60 text-emerald-200',
  },
  warning: {
    border: 'border-amber-700/50',
    icon: '!',
    badge: 'bg-amber-950/60 text-amber-200',
  },
  danger: {
    border: 'border-rose-700/50',
    icon: '✕',
    badge: 'bg-rose-950/60 text-rose-200',
  },
};

function isDismissed(id: string) {
  try {
    return localStorage.getItem(`${DISMISS_PREFIX}${id}`) === '1';
  } catch {
    return false;
  }
}

function markDismissed(id: string) {
  try {
    localStorage.setItem(`${DISMISS_PREFIX}${id}`, '1');
  } catch {
    /* ignore */
  }
}

function embedVideo(url: string) {
  const raw = url.trim();
  if (!raw) return null;
  let embed = raw;
  if (/youtube\.com\/watch\?v=/.test(raw)) {
    embed = raw.replace('watch?v=', 'embed/').split('&')[0];
  } else if (/youtu\.be\//.test(raw)) {
    embed = raw.replace('youtu.be/', 'www.youtube.com/embed/');
  } else if (/vimeo\.com\/(\d+)/.test(raw) && !/player\.vimeo\.com/.test(raw)) {
    embed = raw.replace('vimeo.com/', 'player.vimeo.com/video/');
  }
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(raw)) {
    return (
      <video controls playsInline className="h-full w-full object-contain" src={raw}>
        <track kind="captions" />
      </video>
    );
  }
  return (
    <iframe
      src={embed}
      title="Video"
      className="h-full w-full"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
}

export default function SiteModalsBanner() {
  const pathname = usePathname();
  const { user, checked } = useAuth();
  const [queue, setQueue] = useState<SiteModal[]>([]);
  const [current, setCurrent] = useState<SiteModal | null>(null);

  const loadModals = useCallback(async () => {
    if (!checked) return;
    const site = siteKeyFromPathname(pathname);
    if (site === 'admin') return;

    try {
      const qs = new URLSearchParams({
        site,
        signedIn: user ? '1' : '0',
      });
      const res = await fetch(`/api/site-modals/active?${qs}`);
      const data = await res.json();
      if (!res.ok || !data.ok) return;
      const modals = (Array.isArray(data.modals) ? data.modals : []).filter(
        (m: SiteModal) => m?.id && !isDismissed(m.id),
      );
      setQueue(modals);
      setCurrent(modals[0] || null);
    } catch {
      /* non-fatal */
    }
  }, [pathname, user, checked]);

  useEffect(() => {
    void loadModals();
  }, [loadModals]);

  const dismissCurrent = useCallback(() => {
    setQueue((q) => {
      if (!q.length) return q;
      markDismissed(q[0].id);
      const rest = q.slice(1);
      setCurrent(rest[0] || null);
      return rest;
    });
  }, []);

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismissCurrent();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [current, dismissCurrent]);

  if (!current) return null;

  const variant = VARIANT_STYLES[current.variant] || VARIANT_STYLES.info;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dp-site-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close announcement"
        onClick={dismissCurrent}
      />
      <div
        className={`relative flex max-h-[min(640px,calc(100dvh-2rem))] w-full max-w-lg flex-col overflow-hidden rounded-xl border bg-slate-900 shadow-[0_0_48px_rgba(34,211,238,0.2)] ${variant.border}`}
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-slate-800 px-6 py-4">
          <span
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${variant.badge}`}
            aria-hidden
          >
            {variant.icon}
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="dp-site-modal-title" className="text-lg font-semibold text-white">
              {current.title}
            </h2>
            {queue.length > 1 ? (
              <p className="mt-1 text-xs text-slate-500">
                {queue.findIndex((m) => m.id === current.id) + 1} of {queue.length}
              </p>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {current.message ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{current.message}</p>
          ) : null}
          {current.question ? (
            <p className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
              {current.question}
            </p>
          ) : null}
          {current.videoUrl ? (
            <div className="mt-4 aspect-video overflow-hidden rounded-lg border border-slate-800 bg-black">
              {embedVideo(current.videoUrl)}
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-slate-800 px-6 py-3 text-right">
          <button
            type="button"
            onClick={dismissCurrent}
            className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
          >
            {queue.length > 1 ? 'Next' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
