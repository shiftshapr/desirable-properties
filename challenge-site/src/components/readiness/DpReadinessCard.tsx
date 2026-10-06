import Link from 'next/link';
import { READINESS_ITEMS, shortDate } from '@/data/dp-process';
import { fetchDpReadiness } from '@/lib/v1-readiness.server';

/** One DP's V1 readiness row: a server component for the DP page and the workgroup page. */
export default async function DpReadinessCard({ dpId, compact = false }: { dpId: string; compact?: boolean }) {
  const dp = await fetchDpReadiness(dpId);
  if (!dp) return null;
  const total = READINESS_ITEMS.length;
  const failing = READINESS_ITEMS.filter((i) => dp.checks[i.key]?.pass === false);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-white">V1 readiness</h2>
        <p className="text-sm text-slate-300">
          <span className={`font-semibold ${dp.passed === total ? 'text-emerald-300' : 'text-amber-300'}`}>
            {dp.passed} of {total}
          </span>{' '}
          items pass
        </p>
      </div>
      {!compact ? (
        <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
          {READINESS_ITEMS.map((item, i) => {
            const check = dp.checks[item.key];
            const pass = check?.pass;
            const glyph = pass === null ? '–' : pass ? '✓' : '✗';
            const cls = pass === null ? 'text-slate-500' : pass ? 'text-emerald-300' : 'text-rose-300';
            return (
              <li key={item.key} className="flex gap-2 text-slate-300">
                <span className={`w-4 shrink-0 font-semibold ${cls}`}>{glyph}</span>
                <span>
                  <span className="text-slate-500">{i + 1}.</span> {item.label}
                  <span className="text-slate-500"> — {check?.detail || 'n/a'} · due {shortDate(item.due)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      ) : failing.length ? (
        <p className="mt-2 text-sm text-slate-400">
          Still open: {failing.map((i, idx) => `${idx ? ', ' : ''}${i.label.toLowerCase()}`)}
        </p>
      ) : (
        <p className="mt-2 text-sm text-emerald-300">All items pass.</p>
      )}
      <p className="mt-3 text-sm">
        <Link href="/v1-readiness" className="text-cyan-300 hover:text-cyan-200">
          All 23 DPs on the readiness board →
        </Link>
        <span className="mx-2 text-slate-600">·</span>
        <Link href="/process" className="text-cyan-300 hover:text-cyan-200">
          How the process works →
        </Link>
      </p>
    </section>
  );
}
