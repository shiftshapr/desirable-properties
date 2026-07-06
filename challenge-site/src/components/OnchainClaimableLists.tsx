'use client';

import { useState } from 'react';
import InscriptionClaimModal, { type ClaimTarget } from '@/components/InscriptionClaimModal';
import OrdinalLink from '@/components/OrdinalLink';
import { inscriptionUrl, submissionLink } from '@/lib/ordinalLinks';

type ClaimStatus = 'pending' | 'denied' | 'accepted' | 'delivered';

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
};

const STATUS_OPTIONS: ClaimStatus[] = ['pending', 'denied', 'accepted', 'delivered'];

const STATUS_STYLES: Record<ClaimStatus, string> = {
  pending: 'bg-slate-700/60 text-slate-200 border-slate-600',
  denied: 'bg-red-900/40 text-red-200 border-red-700',
  accepted: 'bg-blue-900/40 text-blue-200 border-blue-700',
  delivered: 'bg-emerald-900/40 text-emerald-200 border-emerald-700',
};

function ClaimButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-md border border-violet-700/60 bg-violet-950/40 px-2.5 py-1 text-xs font-medium text-violet-200 hover:border-violet-500 hover:bg-violet-950/70"
    >
      Claim
    </button>
  );
}

function StatusBadge({ status }: { status: ClaimStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

function StatusSelect({
  value,
  onChange,
}: {
  value: ClaimStatus;
  onChange: (next: ClaimStatus) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ClaimStatus)}
      className="rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
      aria-label="Update claim status"
    >
      {STATUS_OPTIONS.map((s) => (
        <option key={s} value={s} className="capitalize">
          {s}
        </option>
      ))}
    </select>
  );
}

function truncateId(id: string) {
  if (id.length <= 18) return id;
  return `${id.slice(0, 10)}…${id.slice(-6)}`;
}

export default function OnchainClaimableLists({
  pciEmails,
  submissions,
  inscriptionBySource,
}: Props) {
  const [claimTarget, setClaimTarget] = useState<ClaimTarget | null>(null);
  const [pciStatus, setPciStatus] = useState<Record<string, ClaimStatus>>(() =>
    Object.fromEntries(pciEmails.map((e) => [e.id, 'pending' as ClaimStatus])),
  );
  const [submissionStatus, setSubmissionStatus] = useState<Record<string, ClaimStatus>>(() =>
    Object.fromEntries(
      submissions.map((s) => [s.source_file, 'pending' as ClaimStatus]),
    ),
  );

  return (
    <>
      <InscriptionClaimModal target={claimTarget} onClose={() => setClaimTarget(null)} />

      <section className="mt-10 rounded-xl border border-slate-800 bg-slate-900/60 p-6" id="claim-inscription">
        <h2 className="text-2xl font-bold">Claim your inscription</h2>
        <p className="mt-4 text-slate-300">
          The Meta-Layer Initiative inscribed the PCI emails and Second Call submissions for the
          Digital Monument. If an inscription was created for your contribution, you can claim it
          here before <strong className="text-white">September 16, 2026</strong>. A confirmation
          email will be sent to each person who completes a claim. For valid claims, we will deliver
          the inscription by the end of September 2026.
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-6 text-slate-300">
          <li>
            Browse{' '}
            <a href="#early-pci-conversations" className="text-cyan-300 hover:text-cyan-200">
              Early PCI conversations
            </a>{' '}
            or{' '}
            <a href="#second-call-submissions" className="text-cyan-300 hover:text-cyan-200">
              Second Call submissions
            </a>{' '}
            below and find the inscription that matches your work.
          </li>
          <li>
            Preview the inscription on{' '}
            <a
              href="https://ordinals.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-300 hover:text-cyan-200"
            >
              ordinals.com
            </a>{' '}
            to confirm the content is yours.
          </li>
          <li>
            Click <strong className="text-white">Claim</strong> on that row, enter your email, and
            either provide a Taproot address or sign in with Web3Auth on Gov Hub to use your
            custodial Taproot wallet.
          </li>
          <li>
            Once verified, authorship appears on Gov Hub and can be linked from DP provenance on
            this site.
          </li>
        </ol>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              setClaimTarget({
                kind: 'submission',
                inscriptionId: '',
                title: 'Claim by inscription ID',
                manualEntry: true,
              })
            }
            className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
          >
            Claim by inscription ID
          </button>
        </div>
      </section>

      <section className="mt-10" id="early-pci-conversations">
        <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold">
          Early PCI conversations ({pciEmails.length})
        </h2>
        <p className="mt-3 text-slate-400">
          Meta-layer-adjacent emails from People Centered Internet community calls, inscribed as part
          of the satplication.
        </p>
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
          <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
            <thead className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th scope="col" className="px-4 py-3">Title / Chapter</th>
                <th scope="col" className="px-4 py-3">Inscription ID</th>
                <th scope="col" className="px-4 py-3">Submitter</th>
                <th scope="col" className="px-4 py-3">Date</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {pciEmails.map((article) => (
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
                  <td className="px-4 py-3 align-top text-slate-300">
                    {article.author ?? '–'}
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-slate-500">
                    {article.date ?? '–'}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col gap-1.5">
                      <StatusBadge status={pciStatus[article.id] ?? 'pending'} />
                      <StatusSelect
                        value={pciStatus[article.id] ?? 'pending'}
                        onChange={(next) =>
                          setPciStatus((prev) => ({ ...prev, [article.id]: next }))
                        }
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    <ClaimButton
                      onClick={() =>
                        setClaimTarget({
                          kind: 'pci-email',
                          inscriptionId: article.id,
                          title: article.title,
                          subtitle: article.author,
                        })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10" id="second-call-submissions">
        <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold">
          Second Call submissions ({submissions.length})
        </h2>
        <p className="mt-3 text-slate-400">
          Structured submissions from themetalayer.org that informed the Desirable Properties.
        </p>
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
          <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
            <thead className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th scope="col" className="px-4 py-3">Title / File</th>
                <th scope="col" className="px-4 py-3">Inscription ID</th>
                <th scope="col" className="px-4 py-3">Submitter</th>
                <th scope="col" className="px-4 py-3">DP alignments</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {submissions.map((sub) => {
                const link = submissionLink(sub.source_file, inscriptionBySource);
                const inscriptionId = inscriptionBySource[sub.source_file];
                const status = submissionStatus[sub.source_file] ?? 'pending';
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
                        <StatusSelect
                          value={status}
                          onChange={(next) =>
                            setSubmissionStatus((prev) => ({
                              ...prev,
                              [sub.source_file]: next,
                            }))
                          }
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      {inscriptionId ? (
                        <ClaimButton
                          onClick={() =>
                            setClaimTarget({
                              kind: 'submission',
                              inscriptionId,
                              title: sub.title,
                              subtitle: `By ${sub.author}`,
                            })
                          }
                        />
                      ) : (
                        <span className="text-xs text-slate-600">–</span>
                      )}
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
