'use client';

import { useEffect, useState } from 'react';
import type { StyleCheckAuditRow } from '@/lib/style-check.server';

type Summary = {
  total: number;
  errors: number;
  withSuggestions: number;
  rated: number;
  helpful: number;
  composerChecks: number;
  applied: number;
  composerDecided: number;
  medianLatencyMs: number | null;
};

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '–');

/** Audit of AI style checks: what the model said, on what input, and how people judged it. */
export default function StyleChecksPanel() {
  const [filters, setFilters] = useState({ source: '', rated: '', dp: '' });
  const [data, setData] = useState<{ summary: Summary; rows: StyleCheckAuditRow[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v) as [string, string][],
  ).toString();

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/style-checks?${query}`, { cache: 'no-store' })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.message || body.error || `Error ${res.status}`);
        if (!cancelled) {
          setData(body);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  const s = data?.summary;
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-white">AI style checks</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          Every check of a patch or insert against the style guide: from the book composer (before posting) and the
          Review tab (for co-editors). Use the ratings and outcomes to judge whether the model is good enough, and the
          exports to compare models.
        </p>
      </div>

      {s ? (
        <div className="grid gap-3 sm:grid-cols-4">
          <Tile label="Checks" value={String(s.total)} hint={`${s.errors} failed`} />
          <Tile label="With suggestions" value={pct(s.withSuggestions, s.total - s.errors)} />
          <Tile label="Rated helpful" value={pct(s.helpful, s.rated)} hint={`${s.rated} rated`} />
          <Tile
            label="Suggestion applied (composer)"
            value={pct(s.applied, s.composerDecided)}
            hint={`${s.composerDecided} of ${s.composerChecks} with an outcome · median ${s.medianLatencyMs ?? '–'} ms`}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3 text-sm">
        <Select label="Source" value={filters.source} onChange={(v) => setFilters({ ...filters, source: v })}
          options={[['', 'All'], ['composer', 'Composer'], ['review', 'Review tab']]} />
        <Select label="Rating" value={filters.rated} onChange={(v) => setFilters({ ...filters, rated: v })}
          options={[['', 'All'], ['helpful', 'Helpful'], ['unhelpful', 'Not helpful'], ['unrated', 'Unrated']]} />
        <label className="text-slate-400">
          DP
          <input
            value={filters.dp}
            onChange={(e) => setFilters({ ...filters, dp: e.target.value.trim() })}
            placeholder="DP4"
            className="ml-2 w-20 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-white"
          />
        </label>
        <a href={`/api/admin/style-checks?${query}&format=csv&limit=2000`} className="text-cyan-300 underline">
          Export CSV
        </a>
        <a href={`/api/admin/style-checks?${query}&format=json&limit=2000`} className="text-cyan-300 underline">
          Export JSON
        </a>
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {data && !data.rows.length ? <p className="text-sm text-slate-400">No checks yet.</p> : null}

      <ul className="space-y-2">
        {data?.rows.map((r) => (
          <li key={r.id} className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm">
            <details>
              <summary className="cursor-pointer text-slate-200">
                {new Date(r.createdAt).toLocaleString()} · {r.source} · {r.dpId || '–'} ·{' '}
                {r.error ? <span className="text-rose-300">error</span> : r.result?.verdict}
                {r.result?.notes.length ? ` (${r.result.notes.length} notes)` : ''} · {r.model}
                {r.cachedFrom ? ' · cached' : ''}
                {r.outcome ? ` · author ${r.outcome}` : ''}
                {r.helpful === true ? ' · 👍' : r.helpful === false ? ' · 👎' : ''}
              </summary>
              <div className="mt-2 space-y-2 text-slate-300">
                <Field label="Passage" text={r.originalText} />
                <Field label="Proposed" text={r.proposedText} />
                {r.rationale ? <Field label="Rationale" text={r.rationale} /> : null}
                {r.result ? (
                  <div>
                    <p className="text-xs uppercase text-slate-500">Result</p>
                    <p>{r.result.summary}</p>
                    <ul className="list-disc pl-5">
                      {r.result.notes.map((n, i) => (
                        <li key={i}>
                          [{n.section}] {n.issue} → {n.fix}
                        </li>
                      ))}
                    </ul>
                    {r.result.suggestedText ? <Field label="Suggested" text={r.result.suggestedText} /> : null}
                  </div>
                ) : null}
                {r.error ? <Field label="Error" text={r.error} /> : null}
                {r.ratingComment ? <Field label={`Rating comment (${r.ratedBy})`} text={r.ratingComment} /> : null}
                <p className="text-xs text-slate-500">
                  {r.provider} · guide v{r.guideVersion} · prompt v{r.promptVersion} · {r.latencyMs ?? '–'} ms ·{' '}
                  {r.promptTokens ?? '–'} in / {r.completionTokens ?? '–'} out tokens · {r.id}
                </p>
                {r.rawResponse ? (
                  <details>
                    <summary className="cursor-pointer text-xs text-slate-500">Raw model response</summary>
                    <pre className="mt-1 max-h-80 overflow-auto whitespace-pre-wrap text-xs text-slate-400">{r.rawResponse}</pre>
                  </details>
                ) : null}
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function Field({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="whitespace-pre-wrap">{text}</p>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="text-slate-400">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="ml-2 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-white"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
