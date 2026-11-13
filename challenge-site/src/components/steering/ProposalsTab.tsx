'use client';

import { useEffect, useMemo, useState } from 'react';

type Proposal = {
  id: string;
  docKey: string;
  mlNumber: string;
  status: string;
  statusLabel: string;
  author: string;
  coEditor: string | null;
  createdAt: string | null;
  reviewedAt: string | null;
  source: 'community' | 'academy' | 'repair' | 'agent';
  /** Accepted with revisions: this is the revised wording; the original is folded into it. */
  revised: boolean;
  rationale: string;
  reviewNote: string | null;
  section: string | null;
  originalText: string;
  proposedText: string;
  patchMode: string;
  analysis: { recommendation: string; summary: string; run: string } | null;
};

const SIZES = [10, 25, 50];
const SOURCE_LABEL: Record<Proposal['source'], string> = {
  community: 'Community',
  academy: 'Metaweb Academy (open review)',
  repair: 'Steering repair (after the freeze)',
  agent: 'Agent-assisted',
};
const STATUS_TONE: Record<string, string> = {
  accepted: 'border-emerald-700/70 text-emerald-200',
  incorporated: 'border-emerald-700/70 text-emerald-200',
  considered: 'border-cyan-700/70 text-cyan-200',
  declined: 'border-rose-800/70 text-rose-200',
  withdrawn: 'border-slate-700 text-slate-400',
  pending: 'border-amber-700/70 text-amber-200',
};
const REC_LABEL: Record<string, string> = {
  accept: 'Accept',
  accept_revised: 'Accept revised',
  defer: 'Defer',
  decline: 'Decline',
  needs_person: 'Needs a person',
};

const uniq = (xs: Array<string | null>) => [...new Set(xs.filter((x): x is string => Boolean(x)))].sort((a, b) => a.localeCompare(b));

/** Every proposal on the 28 Version 1.0 documents: search as you type, filter, and page 10, 25 or 50 at a time. */
export default function ProposalsTab() {
  const [all, setAll] = useState<Proposal[] | null>(null);
  const [docs, setDocs] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [doc, setDoc] = useState('');
  const [author, setAuthor] = useState('');
  const [status, setStatus] = useState('');
  const [coEditor, setCoEditor] = useState('');
  const [source, setSource] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [size, setSize] = useState(10);
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch('/api/steering/proposals', { cache: 'no-store' })
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as { proposals?: Proposal[]; docs?: Array<{ key: string }>; error?: string };
        if (!res.ok || !body.proposals) throw new Error(body.error || `Proposals unavailable (${res.status})`);
        if (!live) return;
        setAll(body.proposals);
        setDocs((body.docs || []).map((d) => d.key));
      })
      .catch((err) => live && setError(err instanceof Error ? err.message : 'Proposals unavailable'));
    return () => {
      live = false;
    };
  }, []);

  const options = useMemo(
    () => ({
      authors: uniq((all || []).map((p) => p.author)),
      statuses: uniq((all || []).map((p) => p.status)),
      coEditors: uniq((all || []).map((p) => p.coEditor)),
      recs: uniq((all || []).map((p) => p.analysis?.recommendation || null)),
    }),
    [all],
  );

  const shown = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return (all || []).filter((p) => {
      if (doc && p.docKey !== doc) return false;
      if (author && p.author !== author) return false;
      if (status && p.status !== status) return false;
      if (coEditor && (coEditor === '__none' ? p.coEditor : p.coEditor !== coEditor)) return false;
      if (source && p.source !== source) return false;
      if (analysis === '__any' && !p.analysis) return false;
      if (analysis === '__none' && p.analysis) return false;
      if (analysis && !analysis.startsWith('__') && p.analysis?.recommendation !== analysis) return false;
      if (!words.length) return true;
      const hay = [p.docKey, p.author, p.coEditor, p.rationale, p.reviewNote, p.section, p.originalText, p.proposedText, p.analysis?.summary]
        .join(' ')
        .toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [all, q, doc, author, status, coEditor, source, analysis]);

  const pages = Math.max(1, Math.ceil(shown.length / size));
  const at = Math.min(page, pages - 1);
  const slice = shown.slice(at * size, at * size + size);
  const reset = () => setPage(0);
  const filtered = Boolean(q || doc || author || status || coEditor || source || analysis);

  const select = (id: string, label: string, value: string, set: (v: string) => void, items: Array<[string, string]>) => (
    <label className="flex min-w-0 flex-col gap-1 text-xs text-slate-400" htmlFor={id}>
      {label}
      <select
        id={id}
        value={value}
        onChange={(e) => {
          set(e.target.value);
          reset();
        }}
        className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
      >
        <option value="">All</option>
        {items.map(([v, t]) => (
          <option key={v} value={v}>
            {t}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <section aria-label="Proposals" className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-white">Proposals</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-300">
          Every proposal on the 24 DPs and the front matter: 355 made in the open review before the November 9
          freeze (237 of them from 57 community contributors), and 1,280 editorial repairs the steering committee
          made after it. Each shows the co-editor who decided it. A proposal accepted with revisions is listed once,
          as its revised wording.
        </p>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
        <label className="flex flex-col gap-1 text-xs text-slate-400" htmlFor="proposal-search">
          Search
          <input
            id="proposal-search"
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              reset();
            }}
            placeholder="Words in the text, rationale, analysis, section or names"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
          />
        </label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {select('proposal-doc', 'Document', doc, setDoc, docs.map((d) => [d, d]))}
          {select('proposal-author', 'Contributor', author, setAuthor, options.authors.map((a) => [a, a]))}
          {select('proposal-status', 'Status', status, setStatus, options.statuses.map((x) => [x, x[0].toUpperCase() + x.slice(1)]))}
          {select('proposal-coeditor', 'Co-editor', coEditor, setCoEditor, [['__none', 'Not reviewed'], ...options.coEditors.map((c) => [c, c] as [string, string])])}
          {select('proposal-source', 'Source', source, setSource, Object.entries(SOURCE_LABEL))}
          {select('proposal-analysis', 'Generated analysis', analysis, setAnalysis, [
            ['__any', 'Has an analysis'],
            ['__none', 'No analysis'],
            ...options.recs.map((r) => [r, `Recommends: ${REC_LABEL[r] || r}`] as [string, string]),
          ])}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-300">
          <span>
            {all ? `${shown.length} of ${all.length} proposals` : error ? '' : 'Loading proposals…'}
          </span>
          {filtered ? (
            <button
              type="button"
              onClick={() => {
                setQ('');
                setDoc('');
                setAuthor('');
                setStatus('');
                setCoEditor('');
                setSource('');
                setAnalysis('');
                reset();
              }}
              className="text-cyan-300 underline hover:text-cyan-200"
            >
              Clear filters
            </button>
          ) : null}
          <span className="ml-auto flex items-center gap-2">
            Show
            {SIZES.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={size === n}
                onClick={() => {
                  setSize(n);
                  reset();
                }}
                className={`rounded px-2 py-0.5 ${size === n ? 'bg-slate-700 text-white' : 'text-slate-300 hover:text-white'}`}
              >
                {n}
              </button>
            ))}
          </span>
        </div>
      </div>

      {error ? <p className="text-sm text-rose-200">{error}</p> : null}

      <ul className="space-y-3">
        {slice.map((p) => {
          const expanded = open === p.id;
          return (
            <li key={p.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded border px-1.5 py-0.5 text-xs ${STATUS_TONE[p.status] || 'border-slate-700 text-slate-300'}`}>{p.statusLabel}</span>
                <a href={`/steering/${p.mlNumber}`} className="font-semibold text-white hover:underline">
                  {p.docKey}
                </a>
                {p.section ? <span className="text-slate-400">· {p.section}</span> : null}
                <span className="ml-auto text-xs text-slate-500">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''}</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {p.author} · {SOURCE_LABEL[p.source]}
                {p.coEditor ? ` · decided by ${p.coEditor}` : ''}
                {p.revised ? ' · accepted with revisions' : ''}
              </p>
              {p.rationale ? <p className="mt-2 whitespace-pre-line text-slate-200">{expanded ? p.rationale : p.rationale.slice(0, 280) + (p.rationale.length > 280 ? '…' : '')}</p> : null}
              {p.analysis ? (
                <p className="mt-2 rounded-lg border border-violet-900/60 bg-violet-950/20 px-3 py-2 text-xs text-violet-100">
                  <span className="font-semibold">Analysis{p.analysis.run ? ` (${p.analysis.run})` : ''}: {REC_LABEL[p.analysis.recommendation] || p.analysis.recommendation}.</span>{' '}
                  {expanded ? p.analysis.summary : p.analysis.summary.slice(0, 220) + (p.analysis.summary.length > 220 ? '…' : '')}
                </p>
              ) : null}
              {expanded ? (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Original</p>
                    <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-slate-900/70 p-2 text-xs text-slate-300">{p.originalText || '—'}</pre>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Proposed ({p.patchMode || 'replace'})</p>
                    <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-slate-900/70 p-2 text-xs text-slate-100">{p.proposedText || '—'}</pre>
                  </div>
                  {p.reviewNote ? <p className="text-xs text-slate-400 md:col-span-2">Review note: {p.reviewNote}</p> : null}
                </div>
              ) : null}
              <button type="button" onClick={() => setOpen(expanded ? null : p.id)} className="mt-2 text-xs text-cyan-300 underline hover:text-cyan-200">
                {expanded ? 'Show less' : 'Show the change'}
              </button>
            </li>
          );
        })}
      </ul>

      {all && shown.length > size ? (
        <nav aria-label="Pages" className="flex items-center justify-center gap-3 text-sm text-slate-300">
          <button type="button" disabled={at === 0} onClick={() => setPage(at - 1)} className="rounded border border-slate-700 px-3 py-1 disabled:opacity-40">
            Previous
          </button>
          <span>
            Page {at + 1} of {pages}
          </span>
          <button type="button" disabled={at >= pages - 1} onClick={() => setPage(at + 1)} className="rounded border border-slate-700 px-3 py-1 disabled:opacity-40">
            Next
          </button>
        </nav>
      ) : null}
    </section>
  );
}
