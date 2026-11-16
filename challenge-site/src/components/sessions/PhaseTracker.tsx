import { pacificAndUtc, type PhaseRow } from '@/lib/sessions/session-phases';

/** Where this occurrence is in the post-meeting process, with who advanced each phase and when. */
export default function PhaseTracker({ rows, heldFrom, heldTo }: { rows: PhaseRow[]; heldFrom: string; heldTo: string }) {
  return (
    <section id="phase" aria-labelledby="phase-heading" className="scroll-mt-24">
      <h2 id="phase-heading" className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">
        Where this session is
      </h2>
      <p className="mt-4 text-sm text-slate-400">
        Session held {pacificAndUtc(heldFrom)} to{' '}
        {new Date(heldTo).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' })} PT
        ({new Date(heldTo).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC) on Zoom.
      </p>
      <ol className="mt-5 space-y-2">
        {rows.map((row, i) => {
          const current = row.state === 'current';
          const done = row.state === 'done';
          return (
            <li
              key={row.phase}
              aria-current={current ? 'step' : undefined}
              className={`flex gap-3 rounded-xl border px-4 py-3 ${
                current
                  ? 'border-cyan-500/70 bg-cyan-950/40'
                  : done
                    ? 'border-slate-800 bg-slate-900/40'
                    : 'border-slate-800/60 bg-transparent'
              }`}
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  current ? 'bg-cyan-400 text-slate-950' : done ? 'bg-slate-600 text-white' : 'border border-slate-700 text-slate-500'
                }`}
                aria-hidden
              >
                {done ? '✓' : i + 1}
              </span>
              <div className="min-w-0">
                <p className={`font-semibold ${current ? 'text-white' : done ? 'text-slate-200' : 'text-slate-500'}`}>
                  {row.phase}
                  {current ? <span className="ml-2 text-xs font-medium uppercase tracking-wider text-cyan-300">Now</span> : null}
                </p>
                {row.entry ? (
                  <p className="mt-0.5 text-sm text-slate-400">
                    {row.entry.by} · {pacificAndUtc(row.entry.at)}
                    {row.entry.note ? <span className="block text-slate-400">{row.entry.note}</span> : null}
                  </p>
                ) : row.pending ? (
                  <p className="mt-0.5 text-sm text-slate-500">
                    Scheduled: {pacificAndUtc(row.pending.at)} · {row.pending.by}
                    {row.pending.note ? <span className="block">{row.pending.note}</span> : null}
                  </p>
                ) : (
                  <p className="mt-0.5 text-sm text-slate-600">Not reached. Advances only by an explicit, recorded action.</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
