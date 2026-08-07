'use client';

import { useEffect, useRef, useState } from 'react';
import type { ActivityFeedItem } from '@/lib/activity-feed';

const POLL_MS = 60_000;
const TOAST_MS = 6000;
const SEEN_KEY = 'dp_activity_toast_seen';

type Toast = {
  id: string;
  text: string;
  href: string;
};

function loadSeen(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr.slice(-80) : []);
  } catch {
    return new Set();
  }
}

function saveSeen(seen: Set<string>) {
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-80)));
  } catch {
    /* ignore */
  }
}

export default function ActivityToastHost({
  initialItems = [],
}: {
  initialItems?: ActivityFeedItem[];
}) {
  const [toast, setToast] = useState<Toast | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const primedRef = useRef(false);

  useEffect(() => {
    seenRef.current = loadSeen();
    // Prime with SSR items so we don't toast the whole backlog on first load.
    for (const item of initialItems) {
      seenRef.current.add(item.id);
    }
    saveSeen(seenRef.current);
    primedRef.current = true;
  }, [initialItems]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (!primedRef.current) return;
      try {
        const res = await fetch('/api/activity/recent', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { items?: ActivityFeedItem[] };
        const items = data.items || [];
        for (const item of items) {
          if (!item.id || seenRef.current.has(item.id)) continue;
          seenRef.current.add(item.id);
          saveSeen(seenRef.current);
          if (cancelled) return;
          setToast({ id: item.id, text: item.text, href: item.href });
          break;
        }
      } catch {
        /* ignore poll errors */
      }
    }

    const timer = window.setInterval(() => {
      void poll();
    }, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(t);
  }, [toast]);

  if (!toast) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-5 left-1/2 z-[10000] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2"
      aria-live="polite"
    >
      <a
        href={toast.href}
        className="pointer-events-auto block rounded-xl border border-cyan-800/50 bg-slate-950/95 px-4 py-3 text-sm text-slate-100 shadow-lg shadow-black/40 hover:border-cyan-600"
        onClick={() => setToast(null)}
      >
        <span className="text-xs font-medium uppercase tracking-wide text-cyan-400">Activity</span>
        <span className="mt-1 block">{toast.text}</span>
      </a>
    </div>
  );
}
