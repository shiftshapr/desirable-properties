'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AnchorEvalDpStatus } from '@/lib/anchor-eval.server';

/**
 * One-time Claude (Opus 5.5) check of where pending proposals are anchored. Evaluates one DP per
 * request; proposals already evaluated with the same anchor and text are skipped, so re-running is safe.
 */
export default function AnchorEvalPanel() {
  const [dps, setDps] = useState<AnchorEvalDpStatus[] | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/anchor-eval', { cache: 'no-store' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.message || body.error || `Error ${res.status}`);
    setDps(body.dps);
    setEnabled(Boolean(body.enabled));
  }, []);

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'Could not load'));
  }, [load]);

  async function runOne(dp: AnchorEvalDpStatus) {
    setRunning(dp.workgroupId);
    try {
      const res = await fetch('/api/admin/anchor-eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workgroupId: dp.workgroupId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
      const results = (body.results || []) as Array<{ verdict: string | null; error: string | null }>;
      const flagged = results.filter((r) => r.verdict === 'better_elsewhere').length;
      const failed = results.filter((r) => r.error).length;
      setLog((l) => [...l, `${dp.dpId || dp.name}: evaluated ${results.length}, flagged ${flagged}, failed ${failed}, already done ${body.skipped}`]);
    } catch (err) {
      setLog((l) => [...l, `${dp.dpId || dp.name}: ${err instanceof Error ? err.message : 'failed'}`]);
    } finally {
      setRunning(null);
    }
  }

  async function runAll() {
    for (const dp of (dps || []).filter((d) => d.pending > d.evaluated)) {
      await runOne(dp);
    }
    await load().catch(() => undefined);
  }

  const total = (dps || []).reduce(
    (a, d) => ({ pending: a.pending + d.pending, evaluated: a.evaluated + d.evaluated, flagged: a.flagged + d.flagged }),
    { pending: 0, evaluated: 0, flagged: 0 },
  );

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Anchor check (Claude Opus 5.5)</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          Claude reads each chapter and says whether each pending patch or insert is anchored at the best passage. When
          it is not, the Review card shows the reason and co-editors can move it with a pre-filled Revise (the other
          co-editor still approves). Already-evaluated proposals are skipped. Roughly $0.03–0.06 per proposal.
        </p>
      </div>
      {error ? <p className="text-sm text-rose-200">{error}</p> : null}
      {!enabled ? (
        <p className="text-sm text-amber-200">REVIEW_ANTHROPIC_API_KEY is not set on this server, so nothing can run.</p>
      ) : null}
      {dps ? (
        <>
          <p className="text-sm text-slate-300">
            {total.evaluated} of {total.pending} pending proposals evaluated · {total.flagged} flagged
          </p>
          <button
            type="button"
            disabled={!enabled || Boolean(running) || total.evaluated >= total.pending}
            onClick={() => void runAll()}
            className="rounded-lg border border-cyan-700 px-3 py-1.5 text-sm text-cyan-100 hover:border-cyan-400 disabled:opacity-50"
          >
            {running ? 'Running…' : 'Evaluate all remaining'}
          </button>
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-1">DP</th>
                <th>Pending</th>
                <th>Evaluated</th>
                <th>Flagged</th>
                <th>Failed</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {dps.filter((d) => d.pending).map((d) => (
                <tr key={d.workgroupId} className="border-t border-slate-800">
                  <td className="py-1">{d.dpId || d.name}</td>
                  <td>{d.pending}</td>
                  <td>{d.evaluated}</td>
                  <td>{d.flagged}</td>
                  <td>{d.errors}</td>
                  <td>
                    <button
                      type="button"
                      disabled={!enabled || Boolean(running) || d.evaluated >= d.pending}
                      onClick={() => void runOne(d).then(() => load())}
                      className="text-cyan-300 hover:text-cyan-200 disabled:opacity-40"
                    >
                      {running === d.workgroupId ? 'Running…' : 'Evaluate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : !error ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : null}
      {log.length ? (
        <pre className="whitespace-pre-wrap rounded-lg bg-slate-950 p-3 text-xs text-slate-300">{log.join('\n')}</pre>
      ) : null}
    </section>
  );
}
