'use client';

import { Kpi, LoopAlerts, LoopHeader, LoopLoadState, StageCell, StageLegend, govHubDocUrl } from '@/components/admin/LoopShared';
import { ageLabel, useLoopStatus } from '@/lib/dp-loop-status';

const COLUMNS = [
  ['review', 'Review queue', 'Pending proposals and any promoted-but-unpublished working revision'],
  ['govhub', 'Gov Hub served', 'Latest approved ML-Draft revision (what Publish produces)'],
  ['rail', 'Book rail', 'content/local/dpN.md compared to the served Gov Hub body'],
  ['staging', 'Staging sandbox', 'staging.book.desirableproperties.org vs DEV Gov Hub served revision (staging site Review → dev hub → staging book)'],
  ['prod', 'Prod book', 'book.desirableproperties.org rail vs repo rail'],
  ['brc333_web', 'BRC333 web', 'Ordinal reader Live mode via sources-sat localOverride'],
  ['brc333_chain', 'BRC333 on-chain', 'Inscribed copy vs rail. Reinscription is a separate Studio job, never part of Publish'],
] as const;

export default function LoopBookPanel() {
  const { status, error, loading, refreshing, refresh } = useLoopStatus();
  const t = status?.totals ?? {};
  const runs = status?.rail_sync.runs ?? [];
  const lastDispatch = runs.find((r) => r.event === 'repository_dispatch');

  return (
    <section>
      <LoopHeader
        title="Gov Hub DP → BRC333 DP → DP book"
        subtitle="Publish on Review or Gov Hub → approved ML-Draft revision → govhub-rail-sync → content/local/dpN.md → staging then prod book. BRC333 web rails read the same files; on-chain reinscription is a later step."
        status={status}
        refreshing={refreshing}
        onRefresh={refresh}
      />
      <LoopLoadState loading={loading} error={error} />
      <LoopAlerts status={status} />

      {status ? (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            <Kpi label="Pending proposals" value={t.pending_proposals ?? 0} tone={t.pending_proposals ? 'warn' : 'neutral'} />
            <Kpi label="From Canopi" value={t.canopi_channel_proposals ?? 0} hint="Gov Hub proposals with source_channel=canopi (promotable book patches)" />
            <Kpi label="Unpublished revs" value={t.working_revisions ?? 0} tone={t.working_revisions ? 'warn' : 'neutral'} />
            <Kpi label="Rail body drift" value={t.rail_drift ?? 0} tone={t.rail_drift ? 'bad' : 'ok'} />
            <Kpi label="Stale stamps" value={t.stale_stamps ?? 0} tone={t.stale_stamps ? 'warn' : 'ok'} hint="Body matches Gov Hub, stamp names an older revision" />
            <Kpi label="Staging drift" value={t.staging_drift ?? 0} tone={t.staging_drift ? 'bad' : 'ok'} />
            <Kpi label="Prod drift" value={t.prod_drift ?? 0} tone={t.prod_drift ? 'bad' : 'ok'} />
            <Kpi label="Chain behind rail" value={t.chain_behind ?? 0} hint="Inscribed chapters older than the rail (expected until reinscription)" />
          </div>

          <div className="mb-4 rounded-md border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm text-slate-300">
            <div className="mb-1 font-medium text-white">govhub-rail-sync ({status.rail_sync.repo})</div>
            {status.rail_sync.error ? <p className="text-rose-300">{status.rail_sync.error}</p> : null}
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
              {runs.slice(0, 6).map((r) => (
                <a key={r.databaseId} href={r.url} target="_blank" rel="noreferrer" className="hover:text-cyan-300">
                  <span className={r.conclusion === 'success' ? 'text-emerald-300' : r.conclusion ? 'text-rose-300' : 'text-amber-300'}>
                    {r.conclusion || r.status}
                  </span>{' '}
                  {r.event} · {ageLabel(r.createdAt)}
                </a>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Publish-triggered dispatch: {lastDispatch ? `last ${ageLabel(lastDispatch.createdAt)}` : 'never fired yet (no Publish since the hook shipped); daily 06:00 UTC cron is the fallback'}.
            </p>
          </div>

          <div className="mb-2 flex justify-end">
            <StageLegend />
          </div>
          <div className="overflow-x-auto rounded-md border border-slate-800">
            <table className="min-w-[1100px] w-full text-left">
              <thead className="bg-slate-900/70 text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-2 py-2">DP</th>
                  {COLUMNS.map(([key, label, hint]) => (
                    <th key={key} className="px-2 py-2" title={hint}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {status.book.map((row) => (
                  <tr key={row.dp} className="hover:bg-slate-900/40">
                    <td className="px-2 py-2 align-top">
                      <a href={govHubDocUrl(row.ml)} target="_blank" rel="noreferrer" className="text-sm font-medium text-cyan-300 hover:underline">
                        {row.dp}
                      </a>
                      <div className="text-[11px] text-slate-500">{row.ml}</div>
                    </td>
                    {COLUMNS.map(([key]) => (
                      <StageCell key={key} stage={row.stages[key]} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Promote and Publish happen on each DP workgroup&apos;s Review tab. Canopi-only book patches cannot be promoted until they exist as Gov Hub proposals. Synthesize judgments are advisory input, not a gate.
          </p>
        </>
      ) : null}
    </section>
  );
}
