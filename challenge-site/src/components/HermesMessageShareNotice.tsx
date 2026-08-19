'use client';

import { describeSharesAtTurn } from '@/lib/hermesShareActivity';
import type { ThreadShareActivity } from '@/lib/hermesShareActivity';

type HermesMessageShareNoticeProps = {
  shares: ThreadShareActivity[];
  turnId: string | null;
  onManage?: () => void;
};

export default function HermesMessageShareNotice({
  shares,
  turnId,
  onManage,
}: HermesMessageShareNoticeProps) {
  const lines = describeSharesAtTurn(shares, turnId);
  if (!lines.length) return null;

  return (
    <div className="mt-2 w-full border-t border-slate-700/50 pt-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-400">
        <span className="rounded-full border border-slate-600/80 bg-slate-900/80 px-1.5 py-0.5 text-slate-300">
          Shared from here
        </span>
        {lines.map((line) => (
          <span key={line} className="text-slate-400">
            {line}
          </span>
        ))}
        {onManage ? (
          <button
            type="button"
            onClick={onManage}
            className="text-cyan-400/90 underline decoration-cyan-700/50 underline-offset-2 hover:text-cyan-300"
          >
            Manage
          </button>
        ) : null}
      </div>
    </div>
  );
}
