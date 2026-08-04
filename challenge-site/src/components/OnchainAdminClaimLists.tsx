'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import OrdinalLink from '@/components/OrdinalLink';
import {
  CLAIM_STATUS_OPTIONS,
  type ClaimStatus,
  type ClaimStatusStore,
} from '@/lib/onchainClaimStatus';
import { inscriptionUrl, submissionLink } from '@/lib/ordinalLinks';

type PciEmail = {
  id: string;
  title: string;
  author?: string;
  date?: string;
};

type Submission = {
  source_file: string;
  file_number?: number;
  title: string;
  author: string;
  dp_count: number;
};

type Props = {
  pciEmails: PciEmail[];
  submissions: Submission[];
  inscriptionBySource: Record<string, string>;
  initialStatuses: ClaimStatusStore;
  onSignOut?: () => void;
};

const STATUS_STYLES: Record<ClaimStatus, string> = {
  pending: 'bg-slate-700/60 text-slate-200 border-slate-600',
  denied: 'bg-red-900/40 text-red-200 border-red-700',
  accepted: 'bg-blue-900/40 text-blue-200 border-blue-700',
  delivered: 'bg-emerald-900/40 text-emerald-200 border-emerald-700',
};

function StatusBadge({ status }: { status: ClaimStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

function truncateId(id: string) {
  if (id.length <= 18) return id;
  return `${id.slice(0, 10)}…${id.slice(-6)}`;
}

export default function OnchainAdminClaimLists({
  pciEmails,
  submissions,
  inscriptionBySource,
  initialStatuses,
  onSignOut,
}: Props) {
  const [statuses, setStatuses] = useState<ClaimStatusStore>(initialStatuses);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStatuses(initialStatuses);
  }, [initialStatuses]);

  async function updateStatus(
    kind: 'pci-email' | 'submission',
    key: string,
    status: ClaimStatus,
  ) {
    setSavingKey(`${kind}:${key}`);
    setError(null);
    try {
      const res = await fetch('/api/onchain/admin/claims', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, key, status }),
      });
      if (!res.ok) {
        throw new Error('Failed to save status');
      }
      const next = (await res.json()) as ClaimStatusStore;
      setStatuses(next);
    } catch {
      setError('Could not save status. Try again.');
    } finally {
      setSavingKey(null);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    onSignOut?.();
  }

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-400">
            Admin only
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">Inscription claim review</h1>
          <p className="mt-2 max-w-3xl text-slate-300">
            Track PCI email and Second Call submission claims. This page is not linked from the
            public on-chain index.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/onchain"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
          >
            Public on-chain page
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
          >
            Sign out
          </button>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <section className="mt-10" id="early-pci-conversations">
        <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold">
          Early PCI conversations ({pciEmails.length})
        </h2>
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
          <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
            <thead className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th scope="col" className="px-4 py-3">Title / Chapter</th>
                <th scope="col" className="px-4 py-3">Inscription ID</th>
                <th scope="col" className="px-4 py-3">Submitter</th>
                <th scope="col" className="px-4 py-3">Date</th>
                <th scope="col" className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {pciEmails.map((article) => {
                const status = statuses.pci_emails[article.id] ?? 'pending';
                const rowKey = `pci-email:${article.id}`;
                return (
                  <tr key={article.id} className="hover:bg-slate-900/60">
                    <td className="px-4 py-3 align-top">
                      <a
                        href={inscriptionUrl(article.id) ?? '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-cyan-300 hover:text-cyan-200"
                      >
                        {article.title}
                      </a>
                      <OrdinalLink inscriptionId={article.id} className="mt-1 block" />
                    </td>
                    <td className="px-4 py-3 align-top font-mono text-xs text-slate-400">
                      <span title={article.id}>{truncateId(article.id)}</span>
                    </td>
                    <td className="px-4 py-3 align-top text-slate-300">{article.author ?? '–'}</td>
                    <td className="px-4 py-3 align-top text-xs text-slate-500">
                      {article.date ?? '–'}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col gap-1.5">
                        <StatusBadge status={status} />
                        <select
                          value={status}
                          disabled={savingKey === rowKey}
                          onChange={(e) =>
                            updateStatus('pci-email', article.id, e.target.value as ClaimStatus)
                          }
                          className="rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none disabled:opacity-60"
                          aria-label={`Update claim status for ${article.title}`}
                        >
                          {CLAIM_STATUS_OPTIONS.map((option) => (
                            <option key={option} value={option} className="capitalize">
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10" id="second-call-submissions">
        <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold">
          Second Call submissions ({submissions.length})
        </h2>
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
          <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
            <thead className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th scope="col" className="px-4 py-3">Title / File</th>
                <th scope="col" className="px-4 py-3">Inscription ID</th>
                <th scope="col" className="px-4 py-3">Submitter</th>
                <th scope="col" className="px-4 py-3">DP alignments</th>
                <th scope="col" className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {submissions.map((sub) => {
                const link = submissionLink(sub.source_file, inscriptionBySource);
                const inscriptionId = inscriptionBySource[sub.source_file];
                const status = statuses.submissions[sub.source_file] ?? 'pending';
                const rowKey = `submission:${sub.source_file}`;
                return (
                  <tr key={sub.source_file} className="hover:bg-slate-900/60">
                    <td className="px-4 py-3 align-top">
                      {link ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-cyan-300 hover:text-cyan-200"
                        >
                          {sub.title}
                        </a>
                      ) : (
                        <span className="font-medium text-white">{sub.title}</span>
                      )}
                      {inscriptionId && (
                        <OrdinalLink inscriptionId={inscriptionId} className="mt-1 block" />
                      )}
                      <p className="mt-1 text-xs text-slate-500">{sub.source_file}</p>
                    </td>
                    <td className="px-4 py-3 align-top font-mono text-xs text-slate-400">
                      {inscriptionId ? (
                        <span title={inscriptionId}>{truncateId(inscriptionId)}</span>
                      ) : (
                        <span className="text-slate-600">No inscription mapped</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-slate-300">
                      <div className="font-medium text-slate-200">{sub.author}</div>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-slate-400">
                      {sub.dp_count > 0 ? sub.dp_count : '–'}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col gap-1.5">
                        <StatusBadge status={status} />
                        <select
                          value={status}
                          disabled={savingKey === rowKey}
                          onChange={(e) =>
                            updateStatus(
                              'submission',
                              sub.source_file,
                              e.target.value as ClaimStatus,
                            )
                          }
                          className="rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none disabled:opacity-60"
                          aria-label={`Update claim status for ${sub.title}`}
                        >
                          {CLAIM_STATUS_OPTIONS.map((option) => (
                            <option key={option} value={option} className="capitalize">
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
