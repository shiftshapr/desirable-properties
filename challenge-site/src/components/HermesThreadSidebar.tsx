'use client';

export interface HermesThreadSummary {
  id: string;
  title: string;
  surface?: string;
  updatedAt?: string | null;
}

interface HermesThreadSidebarProps {
  threads: HermesThreadSummary[];
  activeThreadId: string | null;
  loading?: boolean;
  onSelect: (threadId: string) => void;
  onCreate: () => void;
}

export default function HermesThreadSidebar({
  threads,
  activeThreadId,
  loading = false,
  onSelect,
  onCreate,
}: HermesThreadSidebarProps) {
  return (
    <aside className="flex w-full flex-col border-r border-slate-800 bg-slate-950 md:w-64 lg:w-72">
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Threads</p>
        <button
          type="button"
          onClick={onCreate}
          className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-cyan-300 hover:border-cyan-600"
        >
          New
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <p className="px-2 py-3 text-xs text-slate-500">Loading threads…</p>
        ) : threads.length === 0 ? (
          <p className="px-2 py-3 text-xs text-slate-500">
            No saved threads yet. Start a new conversation.
          </p>
        ) : (
          <ul className="space-y-1">
            {threads.map((thread) => {
              const active = thread.id === activeThreadId;
              return (
                <li key={thread.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(thread.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                      active
                        ? 'bg-cyan-900/40 text-cyan-100 ring-1 ring-cyan-700/60'
                        : 'text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <span className="line-clamp-2">{thread.title || 'Conversation'}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
