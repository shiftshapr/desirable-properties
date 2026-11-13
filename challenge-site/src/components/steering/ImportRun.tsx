'use client';

import { useState } from 'react';

type Report = {
  label?: string;
  committed?: boolean;
  already_imported?: boolean;
  errors?: string[];
  warnings?: string[];
  mismatches?: Array<{ ml_number: string; problem: string }>;
  repairs?: Array<{ key: string; action: string | null }>;
  analyses?: { imported: number; skipped: unknown[] };
  batches?: Array<{ action: string | null }>;
  issues?: { groups: number; findings: number; fixes: number } | null;
  checks?: { documents: number; clean: number; skipped: unknown[] } | null;
};

/**
 * Import an analysis run (run.json) into the open stage from this page: a dry run first (every check,
 * nothing written), then Apply. Steering members only; replaces the shell pastes (owner, 13 Nov).
 */
export default function ImportRun({ onImported }: { onImported: () => void }) {
  const [run, setRun] = useState<Record<string, unknown> | null>(null);
  const [name, setName] = useState('');
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState<'dry' | 'apply' | null>(null);
  const [error, setError] = useState('');

  async function send(apply: boolean) {
    if (!run) return;
    setBusy(apply ? 'apply' : 'dry');
    setError('');
    try {
      const res = await fetch('/api/steering/runs/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run, apply }),
      });
      const body = (await res.json().catch(() => ({}))) as { report?: Report; error?: string };
      if (!res.ok || !body.report) throw new Error(body.error || `Import failed (${res.status})`);
      setReport(body.report);
      if (apply && body.report.committed) onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setBusy(null);
    }
  }

  async function pick(file: File | undefined) {
    setReport(null);
    setError('');
    setRun(null);
    if (!file) return;
    setName(file.name);
    try {
      const data = JSON.parse(await file.text()) as Record<string, unknown>;
      if (!data || typeof data !== 'object' || typeof data.manifest !== 'object') throw new Error('not a run.json (no manifest)');
      setRun(data);
    } catch (err) {
      setError(`Could not read ${file.name}: ${err instanceof Error ? err.message : 'bad JSON'}`);
    }
  }

  const filed = report?.repairs?.filter((r) => r.action === 'filed' || r.action === 'reused').length ?? 0;
  const ok = report && !report.errors?.length && !report.already_imported;
  return (
    <section aria-label="Import an analysis run" className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-sm">
      <h2 className="font-semibold text-white">Import an analysis run</h2>
      <p className="mt-1 text-slate-400">
        Choose the run.json the steward prepared. Check it first: nothing is written until you press Apply.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept="application/json,.json"
          onChange={(e) => void pick(e.target.files?.[0])}
          className="text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-slate-100"
        />
        <button type="button" disabled={!run || busy !== null} onClick={() => void send(false)}
          className="rounded-lg border border-slate-600 px-3 py-1.5 text-slate-100 hover:border-slate-400 disabled:opacity-40">
          {busy === 'dry' ? 'Checking…' : 'Check (dry run)'}
        </button>
        <button type="button" disabled={!ok || report?.committed || busy !== null} onClick={() => void send(true)}
          className="rounded-lg bg-violet-700 px-3 py-1.5 font-medium text-white hover:bg-violet-600 disabled:opacity-40">
          {busy === 'apply' ? 'Importing…' : 'Apply'}
        </button>
      </div>
      {error ? <p className="mt-2 text-rose-200">{error}</p> : null}
      {report ? (
        <div className="mt-3 space-y-1 text-slate-300">
          <p className="font-medium text-white">
            {report.label || name}: {report.committed ? 'imported.' : report.already_imported ? 'already imported; nothing to do.' : 'dry run, nothing written.'}
          </p>
          <p>
            Fixes {filed} of {report.repairs?.length ?? 0} · analyses {report.analyses?.imported ?? 0} · batches{' '}
            {report.batches?.filter((b) => b.action === 'created').length ?? 0}
            {report.issues ? ` · ${report.issues.findings} findings in ${report.issues.groups} bundles` : ''}
            {report.checks ? ` · ${report.checks.documents} documents checked, ${report.checks.clean} clean` : ''}
          </p>
          {report.mismatches?.length ? (
            <p className="text-amber-200">
              Changed since the analysis (skipped): {report.mismatches.map((m) => `${m.ml_number} (${m.problem})`).join(', ')}
            </p>
          ) : null}
          {report.repairs?.some((r) => r.action?.startsWith('skipped')) ? (
            <p className="text-amber-200">
              {report.repairs.filter((r) => r.action?.startsWith('skipped')).length} fixes skipped:{' '}
              {report.repairs.filter((r) => r.action?.startsWith('skipped')).slice(0, 5).map((r) => `${r.key} (${r.action})`).join('; ')}
            </p>
          ) : null}
          {report.errors?.length ? <p className="text-rose-200">{report.errors.join(' ')}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
