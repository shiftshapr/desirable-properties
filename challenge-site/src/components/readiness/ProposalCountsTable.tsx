import Link from 'next/link';
import type { DpReadiness } from '@/lib/v1-readiness.server';

/** Proposals by DP: open, open with one approval, approved (incorporated) and declined, with a total row. */
export default function ProposalCountsTable({ dps }: { dps: DpReadiness[] }) {
  const rows = [...dps].sort((a, b) => a.number - b.number);
  const sum = (pick: (d: DpReadiness) => number | undefined) => rows.reduce((n, d) => n + (pick(d) || 0), 0);
  const total = {
    open: sum((d) => d.pending_proposals),
    one: sum((d) => d.one_approval_proposals),
    approved: sum((d) => d.accepted_proposals),
    declined: sum((d) => d.declined_proposals),
  };
  const num = 'px-3 py-2 text-right tabular-nums';

  return (
    <section aria-labelledby="proposal-counts-heading">
      <h2 id="proposal-counts-heading" className="text-xl font-semibold text-white">
        Proposals by DP
      </h2>
      <p className="mt-1 text-sm text-slate-400">
        Open proposals are waiting for a co-editor decision; “one approval” are open ones with one approval so far.
        Approved proposals are incorporated into the next revision.
      </p>
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[32rem] text-sm">
          <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">DP</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Open</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">One approval</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Approved</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Declined</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.acronym} className="border-t border-slate-800/70">
                <th scope="row" className="px-3 py-2 text-left font-normal">
                  {d.slug ? (
                    <Link href={`/workgroups/${d.slug}?tab=review`} className="text-cyan-300 hover:text-cyan-200" title={d.name}>
                      {d.dp}
                    </Link>
                  ) : (
                    <span className="text-slate-200" title={d.name}>{d.dp}</span>
                  )}
                </th>
                <td className={`${num} ${d.pending_proposals ? 'text-amber-200' : 'text-slate-500'}`}>{d.pending_proposals}</td>
                <td className={`${num} ${d.one_approval_proposals ? 'text-cyan-200' : 'text-slate-500'}`}>
                  {d.one_approval_proposals ?? '–'}
                </td>
                <td className={`${num} ${d.accepted_proposals ? 'text-emerald-200' : 'text-slate-500'}`}>{d.accepted_proposals}</td>
                <td className={`${num} ${d.declined_proposals ? 'text-rose-200' : 'text-slate-500'}`}>
                  {d.declined_proposals ?? '–'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-slate-700 bg-slate-900/40 font-semibold text-white">
            <tr>
              <th scope="row" className="px-3 py-2 text-left">Total</th>
              <td className={num}>{total.open}</td>
              <td className={num}>{total.one}</td>
              <td className={num}>{total.approved}</td>
              <td className={num}>{total.declined}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
