'use client';

import { useEffect } from 'react';

export default function AgentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Deepi agent error:', error);
  }, [error]);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-slate-950 px-6 py-12 text-center">
      <h1 className="text-lg font-semibold text-white">Deepi hit a snag</h1>
      <p className="mt-2 max-w-md text-sm text-slate-400">
        Something went wrong loading the chat. Your conversations are still saved — try reloading
        or starting fresh.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
        >
          Try again
        </button>
        <a
          href="/agent"
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900"
        >
          Reload Deepi
        </a>
      </div>
    </div>
  );
}
