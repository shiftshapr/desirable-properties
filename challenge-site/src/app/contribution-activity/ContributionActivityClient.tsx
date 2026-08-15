'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

export type ContributionActivityDiscussLink = {
  label: string;
  href: string;
  messageId?: string | null;
};

export type ContributionActivityRow = {
  id: string;
  source: 'ledger' | 'orphan';
  contributorEmail: string;
  contributorName: string | null;
  draftRef: string;
  mode: 'draft' | 'publish';
  proposalCount: number;
  proposalLabels: string[];
  filedAt: string | null;
  threadId: string | null;
  threadTitle: string | null;
  discussLinks: ContributionActivityDiscussLink[];
  status: string;
  orphan: boolean;
};

export type ContributionActivitySummary = {
  contributorCount: number;
  setsFiled: number;
  dpsTouched: number;
  threadsWithFiling: number;
};

type Props = {
  rows: ContributionActivityRow[];
  summary: ContributionActivitySummary;
  isAdmin: boolean;
};

function formatFiledAt(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function contributorLabel(row: ContributionActivityRow) {
  return row.contributorName || row.contributorEmail || 'Unknown';
}

export default function ContributionActivityClient({ rows, summary, isAdmin }: Props) {
  const [roundFilter, setRoundFilter] = useState('');
  const [modeFilter, setModeFilter] = useState<'all' | 'draft' | 'publish'>('all');
  const [contributorFilter, setContributorFilter] = useState('');

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
      if (contributorFilter && row.contributorEmail !== contributorFilter) return false;
      return true;
    });
  }, [rows, roundFilter, modeFilter, contributorFilter]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-wide text-cyan-300">Discuss &amp; Patch</p>
        <h1 className="mt-2 text-3xl font-bold text-white">Contribution activity</h1>
        <p className="mt-3 max-w-3xl text-slate-300">
          Hermes contribution filings across Discuss — your published sets and any orphan hermes-dp
          posts not yet linked to a thread record.
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Contributors', value: summary.contributorCount },
          { label: 'Sets filed', value: summary.setsFiled },
          { label: 'DPs touched', value: summary.dpsTouched },
          { label: 'Hermes threads', value: summary.threadsWithFiling },
        ].map((card) => (
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
          <strong className="text-white">{rows.length}</strong> filings
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700/80">
        <table className="min-w-full divide-y divide-slate-700 text-sm">
          <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              {isAdmin ? <th className="px-4 py-3">Contributor</th> : null}
              <th className="px-4 py-3">Round</th>
              <th className="px-4 py-3">Mode</th>
              <th className="px-4 py-3">Proposals</th>
              <th className="px-4 py-3">Filed at</th>
              <th className="px-4 py-3">Thread title</th>
              <th className="px-4 py-3">Discuss links</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950/40">
            {filteredRows.length === 0 ? (
              <tr>
                <td
                  colSpan={isAdmin ? 7 : 6}
                  className="px-4 py-10 text-center text-slate-400"
                >
                  No contribution filings match these filters yet.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={row.id} className="align-top text-slate-200">
                  {isAdmin ? (
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{contributorLabel(row)}</div>
                      <div className="text-xs text-slate-500">{row.contributorEmail}</div>
                    </td>
                  ) : null}
                  <td className="px-4 py-3">
                    <span className="font-medium text-cyan-300">{row.draftRef || '—'}</span>
                    {row.orphan ? (
                      <span className="ml-2 rounded-full border border-amber-700/60 bg-amber-950/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-200">
                        Orphan
                      </span>
                    ) : null}
                  </td>
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
                    {formatFiledAt(row.filedAt)}
                  </td>
                  <td className="px-4 py-3">
                    {row.threadTitle ? (
                      <div>
                        <div className="text-white">{row.threadTitle}</div>
                        {row.threadId ? (
                          <Link href="/agent" className="text-xs text-cyan-400 hover:underline">
                            Open Hermes
                          </Link>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-slate-500">—</span>
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
