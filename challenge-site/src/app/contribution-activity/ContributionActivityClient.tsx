'use client';

import { useCallback, useMemo, useState } from 'react';
import UserDateTime from '@/components/UserDateTime';

export type ContributionActivityDiscussLink = {
  label: string;
  href: string;
  messageId?: string | null;
};

export type ContributionActivityRow = {
  id: string;
  source: 'ledger' | 'orphan' | 'discuss';
  activitySource?: 'hermes' | 'discuss';
  sourceApp?: string | null;
  contributorEmail: string;
  contributorName: string | null;
  draftRef: string;
  mode: 'draft' | 'publish';
  tagType?: string | null;
  proposalCount: number;
  proposalLabels: string[];
  filedAt: string | null;
  discussLinks: ContributionActivityDiscussLink[];
  status: string;
  orphan: boolean;
};

export type ContributionActivitySummary = {
  contributorCount: number;
  setsFiled: number;
  dpsTouched: number;
  threadsWithFiling: number;
  hermesPosts?: number;
  discussPosts?: number;
};

export type ContributionActivityScope = 'hermes' | 'all';

type Props = {
  initialRows: ContributionActivityRow[];
  initialSummary: ContributionActivitySummary;
  isAdmin: boolean;
  showContributors?: boolean;
  initialScope?: ContributionActivityScope;
};

function contributorLabel(row: ContributionActivityRow) {
  return row.contributorName || row.contributorEmail || 'Unknown';
}

export default function ContributionActivityClient({
  initialRows,
  initialSummary,
  isAdmin,
  showContributors = false,
  initialScope = 'hermes',
}: Props) {
  const [scope, setScope] = useState<ContributionActivityScope>(initialScope);
  const [rows, setRows] = useState(initialRows);
  const [summary, setSummary] = useState(initialSummary);
  const [loadingScope, setLoadingScope] = useState<ContributionActivityScope | null>(null);
  const [scopeError, setScopeError] = useState<string | null>(null);
  const [roundFilter, setRoundFilter] = useState('');
  const [modeFilter, setModeFilter] = useState<'all' | 'draft' | 'publish'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'hermes' | 'discuss'>('all');
  const [contributorFilter, setContributorFilter] = useState('');

  const loadScope = useCallback(async (nextScope: ContributionActivityScope) => {
    if (nextScope === scope) return;
    setScopeError(null);
    setLoadingScope(nextScope);
    try {
      const params = new URLSearchParams({ scope: nextScope });
      if (isAdmin) {
        params.set('admin', '1');
      } else {
        params.set('public', '1');
      }
      const response = await fetch(`/api/agent/contribution-activity?${params.toString()}`, {
        cache: 'no-store',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Could not load contribution activity');
      }
      setRows(data.rows || []);
      setSummary(
        data.summary || {
          contributorCount: 0,
          setsFiled: 0,
          dpsTouched: 0,
          threadsWithFiling: 0,
        },
      );
      setScope(nextScope);
      setRoundFilter('');
      setModeFilter('all');
      setSourceFilter('all');
      setContributorFilter('');
    } catch (err) {
      setScopeError(err instanceof Error ? err.message : 'Could not load contribution activity');
    } finally {
      setLoadingScope(null);
    }
  }, [isAdmin, scope]);

  const rounds = useMemo(
    () => [...new Set(rows.map((row) => row.draftRef).filter(Boolean))].sort(),
    [rows],
  );

  const contributors = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of rows) {
      const key = row.contributorEmail || contributorLabel(row);
      map.set(key, contributorLabel(row));
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (roundFilter && row.draftRef !== roundFilter) return false;
      if (modeFilter !== 'all' && row.mode !== modeFilter) return false;
      if (sourceFilter !== 'all' && row.activitySource !== sourceFilter) return false;
      if (contributorFilter && row.contributorEmail !== contributorFilter) return false;
      return true;
    });
  }, [rows, roundFilter, modeFilter, sourceFilter, contributorFilter]);

  const summaryCards =
    scope === 'all'
      ? [
          { label: 'Contributors', value: summary.contributorCount },
          { label: 'Published posts', value: summary.setsFiled },
          { label: 'DPs touched', value: summary.dpsTouched },
          { label: 'Via Hermes', value: summary.hermesPosts ?? 0 },
          { label: 'Direct Discuss', value: summary.discussPosts ?? 0 },
        ]
      : [
          { label: 'Contributors', value: summary.contributorCount },
          { label: 'Sets filed', value: summary.setsFiled },
          { label: 'DPs touched', value: summary.dpsTouched },
          { label: 'Hermes threads', value: summary.threadsWithFiling },
        ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-wide text-cyan-300">Discuss &amp; Patch</p>
        <h1 className="mt-2 text-3xl font-bold text-white">Contribution activity</h1>
        <p className="mt-3 max-w-3xl text-slate-300">
          {scope === 'all'
            ? 'Published Discuss patches, inserts, and comments on Desirable Properties book pages — Hermes filings and direct Discuss posts.'
            : 'Hermes contribution filings across Discuss — published sets filed through Hermes.'}
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {([
          ['hermes', 'Hermes filings'],
          ['all', 'All Discuss activity'],
        ] as const).map(([value, label]) => {
          const active = scope === value;
          const loading = loadingScope === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => loadScope(value)}
              disabled={loading || loadingScope !== null}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                active
                  ? 'bg-cyan-600 text-white'
                  : 'border border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-700 hover:text-white'
              } ${loading ? 'opacity-60' : ''}`}
            >
              {loading ? 'Loading…' : label}
            </button>
          );
        })}
      </div>

      {scopeError ? (
        <p className="mb-4 rounded-lg border border-rose-800/60 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
          {scopeError}
        </p>
      ) : null}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-700/80 bg-slate-900/60 px-4 py-5"
          >
            <p className="text-xs uppercase tracking-wide text-slate-400">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-3">
          <label className="block">
            <span className="mb-1 block text-xs text-slate-400">Round</span>
            <select
              value={roundFilter}
              onChange={(event) => setRoundFilter(event.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            >
              <option value="">All rounds</option>
              {rounds.map((round) => (
                <option key={round} value={round}>
                  {round}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-slate-400">Mode</span>
            <select
              value={modeFilter}
              onChange={(event) => setModeFilter(event.target.value as 'all' | 'draft' | 'publish')}
              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            >
              <option value="all">All modes</option>
              <option value="publish">Published</option>
              <option value="draft">Draft</option>
            </select>
          </label>

          {scope === 'all' ? (
            <label className="block">
              <span className="mb-1 block text-xs text-slate-400">Source</span>
              <select
                value={sourceFilter}
                onChange={(event) =>
                  setSourceFilter(event.target.value as 'all' | 'hermes' | 'discuss')
                }
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              >
                <option value="all">All sources</option>
                <option value="hermes">Hermes</option>
                <option value="discuss">Direct Discuss</option>
              </select>
            </label>
          ) : null}

          {isAdmin ? (
            <label className="block">
              <span className="mb-1 block text-xs text-slate-400">Contributor</span>
              <select
                value={contributorFilter}
                onChange={(event) => setContributorFilter(event.target.value)}
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              >
                <option value="">All contributors</option>
                {contributors.map(([email, label]) => (
                  <option key={email} value={email}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <p className="text-sm text-slate-400">
          Showing <strong className="text-white">{filteredRows.length}</strong> of{' '}
          <strong className="text-white">{rows.length}</strong>{' '}
          {scope === 'all' ? 'posts' : 'filings'}
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700/80">
        <table className="min-w-full divide-y divide-slate-700 text-sm">
          <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              {showContributors ? <th className="px-4 py-3">Contributor</th> : null}
              <th className="px-4 py-3">Round</th>
              {scope === 'all' ? <th className="px-4 py-3">Source</th> : null}
              <th className="px-4 py-3">Mode</th>
              <th className="px-4 py-3">Proposals</th>
              <th className="px-4 py-3">Filed at</th>
              <th className="px-4 py-3">Discuss links</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950/40">
            {filteredRows.length === 0 ? (
              <tr>
                <td
                  colSpan={showContributors ? (scope === 'all' ? 7 : 6) : scope === 'all' ? 6 : 5}
                  className="px-4 py-10 text-center text-slate-400"
                >
                  No {scope === 'all' ? 'Discuss posts' : 'contribution filings'} match these filters yet.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={row.id} className="align-top text-slate-200">
                  {showContributors ? (
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{contributorLabel(row)}</div>
                      <div className="text-xs text-slate-500">{row.contributorEmail}</div>
                    </td>
                  ) : null}
                  <td className="px-4 py-3">
                    <span className="font-medium text-cyan-300">{row.draftRef || '—'}</span>
                  </td>
                  {scope === 'all' ? (
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                          row.activitySource === 'hermes'
                            ? 'border border-cyan-700/60 bg-cyan-950/40 text-cyan-200'
                            : 'border border-slate-600/60 bg-slate-900/60 text-slate-300'
                        }`}
                      >
                        {row.activitySource === 'hermes' ? 'Hermes' : 'Discuss'}
                      </span>
                      {row.sourceApp && row.activitySource === 'discuss' ? (
                        <div className="mt-1 text-xs text-slate-500">{row.sourceApp}</div>
                      ) : null}
                    </td>
                  ) : null}
                  <td className="px-4 py-3 capitalize">{row.mode}</td>
                  <td className="px-4 py-3">
                    <div>{row.proposalCount}</div>
                    {row.proposalLabels.length ? (
                      <div className="mt-1 text-xs text-slate-400">
                        {row.proposalLabels.join(', ')}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-300">
                    {row.filedAt ? (
                      <UserDateTime value={row.filedAt} mode="datetime" />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.discussLinks.length ? (
                      <ul className="space-y-1">
                        {row.discussLinks.map((link) => (
                          <li key={`${row.id}-${link.href}`}>
                            <a
                              href={link.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-400 hover:underline"
                            >
                              {link.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
