'use client';

import { useEffect } from 'react';
import { describeShareActivity } from '@/lib/hermesShareActivity';
import { useThreadShares } from '@/lib/useThreadShares';

type HermesShareStatusProps = {
  threadId: string;
  controllerName?: string | null;
  onManageShare?: () => void;
  /** Bump to force refresh after creating a share. */
  refreshKey?: number;
};

export default function HermesShareStatus({
  threadId,
  controllerName,
  onManageShare,
  refreshKey = 0,
}: HermesShareStatusProps) {
  const { activeShares, loading, refresh } = useThreadShares(threadId, true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    void refresh();
  }, [refreshKey, refresh]);

  if (!loading && !activeShares.length && !controllerName) return null;

  const lines: string[] = [];
  if (controllerName) {
    lines.push(`${controllerName} has control`);
  }
  for (const share of activeShares) {
    lines.push(...describeShareActivity(share));
  }

  if (!lines.length && loading) return null;

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-[11px] text-slate-400">
      <span
        className="shrink-0 rounded-full border border-slate-600 bg-slate-900 px-2 py-0.5 text-slate-300"
        title="Active shares on this conversation"
      >
        Shared
      </span>
      {lines.map((line) => (
        <span key={line} className="min-w-0 truncate text-slate-400">
          {line}
        </span>
      ))}
      {onManageShare ? (
        <button
          type="button"
          onClick={onManageShare}
          className="shrink-0 text-cyan-400/90 underline decoration-cyan-700/50 underline-offset-2 hover:text-cyan-300"
        >
          Manage
        </button>
      ) : null}
    </div>
  );
}
