import { useCallback, useEffect, useState } from 'react';
import type { ThreadShareActivity } from '@/lib/hermesShareActivity';

const POLL_MS = 12000;

export function useThreadShares(threadId: string | null, enabled = true) {
  const [shares, setShares] = useState<ThreadShareActivity[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!threadId || !enabled) {
      setShares([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/agent/threads/${encodeURIComponent(threadId)}/shares`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.shares)) {
        setShares(data.shares);
      }
    } finally {
      setLoading(false);
    }
  }, [threadId, enabled]);

  useEffect(() => {
    void refresh();
    if (!threadId || !enabled) return undefined;
    const timer = window.setInterval(() => {
      void refresh();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [threadId, enabled, refresh]);

  const activeShares = shares.filter((s) => s.status === 'active');

  return { shares, activeShares, loading, refresh };
}
