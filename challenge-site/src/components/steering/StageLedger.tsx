import ledger from '@/data/steering-ledger.json';
import type { SteeringStage } from '@/lib/dp-steering';

type LedgerRow = {
  analysis: string;
  itemsIn: string;
  findings: string;
  fixes: string;
  decisions: string;
  notes: string[];
};

const ROWS = ledger.stages as Record<string, LedgerRow>;

function day(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function outcome(s: SteeringStage): string {
  if (s.status === 'upcoming') return 'Not started';
  const t = s.totals;
  const counts = t ? `${t.accepted} accepted · ${t.deferred} deferred · ${t.declined} declined` : '';
  if (s.status === 'open') return t && t.open ? `Open: ${t.open} open so far` : 'Open';
  return counts || 'Closed';
}

/**
 * The Ledger: every stage in one table, with the same measures for each. Dates and outcomes come live
 * from Gov Hub; what each stage's analysis found is kept in src/data/steering-ledger.json, updated as
 * each stage runs.
 */
export default function StageLedger({ stages }: { stages: SteeringStage[] }) {
  const cols = ['Stage', 'Dates', 'Analysis', 'Items in', 'Findings', 'Fixes filed', 'Steering decisions', 'Outcome'];
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Ledger</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-300">
          How Version 1.0 moved through each stage: what came in, what the analysis found, what was filed for a
          vote, and what steering decided. Dates and outcomes are live; the analysis figures are recorded as each
          stage runs.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="min-w-[56rem] w-full text-left text-sm">
          <thead className="bg-slate-950/60 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              {cols.map((c) => (
                <th key={c} scope="col" className="px-3 py-2 font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 align-top text-slate-200">
            {stages.map((s) => {
              const r = ROWS[s.key];
              const dates =
                s.status === 'upcoming'
                  ? 'Not started'
                  : `${day(s.openedAt)} → ${s.closedAt ? day(s.closedAt) : 'open'}${s.closedByName && s.closedAt ? ` (${s.closedByName})` : ''}`;
              return (
                <tr key={s.key} className={s.status === 'open' ? 'bg-violet-950/20' : undefined}>
                  <th scope="row" className="px-3 py-3 font-semibold text-white">
                    {s.title}
                  </th>
                  <td className="px-3 py-3 whitespace-nowrap text-slate-300">{dates}</td>
                  <td className="px-3 py-3 text-slate-300">{r?.analysis || '—'}</td>
                  <td className="px-3 py-3">{r?.itemsIn || '—'}</td>
                  <td className="px-3 py-3">{r?.findings || '—'}</td>
                  <td className="px-3 py-3">{r?.fixes || '—'}</td>
                  <td className="px-3 py-3">{r?.decisions || '—'}</td>
                  <td className="px-3 py-3">{outcome(s)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {stages
          .filter((s) => ROWS[s.key]?.notes.length)
          .map((s) => (
            <div key={s.key} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <h3 className="text-sm font-semibold text-white">{s.title}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                {ROWS[s.key].notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          ))}
      </div>
      <p className="text-xs text-slate-500">Analysis figures last recorded {ledger.updated}.</p>
    </section>
  );
}
