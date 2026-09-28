'use client';

import { Fragment, useState } from 'react';
import { Kpi, LoopAlerts, LoopHeader, LoopLoadState, StageCell, StageLegend, govHubDocUrl } from '@/components/admin/LoopShared';
import { useLoopStatus } from '@/lib/dp-loop-status';

const COLUMNS = [
  ['govhub', 'Gov Hub DP', 'Served (published) DP revision: the Gate 1 trigger'],
  ['ml_req_working', 'ML-REQ working set', 'Unpublished generated set (canonical:false) and which DP body it came from'],
  ['ml_req_published', 'ML-REQ published', 'Chair-published ML-REQ-NNN on Gov Hub'],
  ['ml_adr', 'ML-ADR', 'ADR sketches (surfaces) vs accepted ML-ADR-NNN'],
  ['coding', 'Overweb coding', 'Tracked code that cites DPn-REQ ids'],
] as const;

export default function LoopReqsPanel() {
  const { status, error, loading, refreshing, refresh } = useLoopStatus();
  const [open, setOpen] = useState<string | null>(null);
  const t = status?.totals ?? {};
  const mc = status?.records.meta_console;

  return (
    <section>
      <LoopHeader
        title="Gov Hub DPs → ML-REQ → ML-ADR → Overweb coding"
        subtitle="A published DP revision opens an unpublished ML-REQ clone with a diff. Chairs publish ML-REQ-NNN; ADRs pick surfaces; Overweb code and CI implement them. Regeneration never overwrites published REQs."
        status={status}
        refreshing={refreshing}
        onRefresh={refresh}
      />
      <LoopLoadState loading={loading} error={error} />
      <LoopAlerts status={status} />

      {status ? (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            <Kpi label="Working REQs" value={t.reqs ?? 0} />
            <Kpi label="MUST clauses" value={t.must ?? 0} />
            <Kpi label="From published DP" value={`${t.reqs_from_published ?? 0}/${status.reqs.length}`} tone={t.reqs_from_published === status.reqs.length ? 'ok' : 'warn'} hint="Working sets whose source is the Gov Hub served revision (not an Astra release)" />
            <Kpi label="Regen clones" value={t.pending_clones ?? 0} tone={t.pending_clones ? 'warn' : 'neutral'} hint="Unpublished regenerations awaiting chair review" />
            <Kpi label="ML-REQ-NNN" value={t.numbered_reqs ?? 0} />
            <Kpi label="ML-ADR-NNN" value={t.numbered_adrs ?? 0} />
            <Kpi label="Code refs" value={Object.values(status.code.repos).reduce((n, r) => n + r.refs, 0)} />
          </div>

          <div className="mb-2 flex justify-end">
            <StageLegend />
          </div>
          <div className="overflow-x-auto rounded-md border border-slate-800">
            <table className="min-w-[960px] w-full text-left">
              <thead className="bg-slate-900/70 text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-2 py-2">DP</th>
                  {COLUMNS.map(([key, label, hint]) => (
                    <th key={key} className="px-2 py-2" title={hint}>
                      {label}
                    </th>
                  ))}
                  <th className="px-2 py-2">MUST / SHOULD / COULD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {status.reqs.map((row) => (
                  <Fragment key={row.dp}>
                    <tr className="cursor-pointer hover:bg-slate-900/40" onClick={() => setOpen(open === row.dp ? null : row.dp)}>
                      <td className="px-2 py-2 align-top">
                        <a href={govHubDocUrl(row.ml)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-sm font-medium text-cyan-300 hover:underline">
                          {row.dp}
                        </a>
                        <div className="text-[11px] text-slate-500">{open === row.dp ? '▾' : '▸'} {row.req_ids.length} REQs</div>
                      </td>
                      {COLUMNS.map(([key]) => (
                        <StageCell key={key} stage={row.stages[key]} />
                      ))}
                      <td className="px-2 py-2 align-top text-xs tabular-nums text-slate-300">
                        {row.reqset.must ?? 0} / {row.reqset.should ?? 0} / {row.reqset.could ?? 0}
                      </td>
                    </tr>
                    {open === row.dp ? (
                      <tr className="bg-slate-950/60">
                        <td colSpan={COLUMNS.length + 2} className="px-4 py-3 text-xs text-slate-300">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <div className="mb-1 font-medium text-white">Requirements</div>
                              <ul className="space-y-0.5">
                                {row.req_ids.map((id) => (
                                  <li key={id}>
                                    <a href={`https://theoverweb.org/reqs/${row.dp.toLowerCase()}/`} target="_blank" rel="noreferrer" className="hover:text-cyan-300">
                                      {id}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <div className="mb-1 font-medium text-white">ADR sketches (surfaces, not accepted)</div>
                              <ul className="space-y-0.5">
                                {row.adr_sketch_ids.map((id) => (
                                  <li key={id}>{id}</li>
                                ))}
                              </ul>
                              <div className="mt-3 text-slate-500">
                                Source: {row.reqset.source_kind ?? '?'} {row.reqset.release ?? ''}
                                {row.reqset.astra?.baselineMlDraft ? ` (baseline ${row.reqset.astra.baselineMlDraft})` : ''}
                                {row.served ? ` · Gov Hub serves rev ${row.served.revision}` : ''}
                              </div>
                              {row.clone ? (
                                <div className="mt-2 text-amber-200">
                                  Pending clone: +{row.clone.diff?.added?.length ?? 0} −{row.clone.diff?.removed?.length ?? 0} ~{row.clone.diff?.changed?.length ?? 0} ({row.clone.file})
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-300">
              <div className="mb-2 text-sm font-medium text-white">Numbered records outside Gov Hub</div>
              <p className="mb-2 text-slate-500">meta-console YAML (agent-security bundle). Not Gov Hub numbers, so they can collide with ML-REQ-NNN.</p>
              <ul className="space-y-0.5">
                {[...(mc?.reqs ?? []), ...(mc?.adrs ?? [])].map((r) => (
                  <li key={r.id}>
                    <span className="text-slate-200">{r.id}</span> · {r.status ?? '?'} · {r.title ?? ''}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-300">
              <div className="mb-2 text-sm font-medium text-white">Code repos</div>
              <ul className="space-y-1">
                {Object.entries(status.code.repos).map(([name, r]) => (
                  <li key={name}>
                    <span className="text-slate-200">{name}</span>: {r.refs} REQ refs · {r.uncommitted_paths} uncommitted paths
                    <div className="truncate text-slate-500">{r.head}</div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-300">
              <div className="mb-2 text-sm font-medium text-white">Issues / PRs citing REQs</div>
              {status.code.issues.error ? <p className="text-rose-300">{status.code.issues.error}</p> : null}
              {status.code.issues.items.length ? (
                <ul className="space-y-0.5">
                  {status.code.issues.items.map((i) => (
                    <li key={i.url}>
                      <a href={i.url} target="_blank" rel="noreferrer" className="hover:text-cyan-300">
                        {i.title}
                      </a>{' '}
                      · {i.state}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500">None in Bridgit-DAO yet.</p>
              )}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
