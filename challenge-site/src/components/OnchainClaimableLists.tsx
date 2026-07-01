'use client';

import { useState } from 'react';
import InscriptionClaimModal, { type ClaimTarget } from '@/components/InscriptionClaimModal';
import OrdinalLink from '@/components/OrdinalLink';
import { govhubUrl } from '@/lib/govhub';
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

export default function OnchainClaimableLists({
  pciEmails,
  submissions,
  inscriptionBySource,
}: Props) {
  const [claimTarget, setClaimTarget] = useState<ClaimTarget | null>(null);

  return (
    <>
      <InscriptionClaimModal target={claimTarget} onClose={() => setClaimTarget(null)} />

      <section className="mt-10 rounded-xl border border-slate-800 bg-slate-900/60 p-6" id="claim-inscription">
        <h2 className="text-2xl font-bold">Claim your inscription</h2>
        <p className="mt-4 text-slate-300">
          The Meta-Layer Initiative inscribed the PCI emails and Second Call submissions for the
          Digital Monument. If an inscription was created for your contribution, you can claim it
          here before <strong className="text-white">September 18, 2026</strong>. A confirmation
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
          <a
            href={govhubUrl('/immortalize/')}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
          >
            Gov Hub inscription tools →
          </a>
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
        <ul className="mt-6 divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900/40">
          {pciEmails.map((article) => (
            <li key={article.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <a
                  href={inscriptionUrl(article.id) ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-cyan-300 hover:text-cyan-200"
                >
                  {article.title}
                </a>
                <p className="mt-1 text-xs text-slate-500">
                  {article.author}
                  {article.date ? ` · ${article.date}` : ''}
                </p>
                <OrdinalLink inscriptionId={article.id} className="mt-1 block" />
              </div>
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
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10" id="second-call-submissions">
        <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold">
          Second Call submissions ({submissions.length})
        </h2>
        <p className="mt-3 text-slate-400">
          Structured submissions from themetalayer.org that informed the Desirable Properties.
        </p>
        <ul className="mt-6 divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900/40">
          {submissions.map((sub) => {
            const link = submissionLink(sub.source_file, inscriptionBySource);
            const inscriptionId = inscriptionBySource[sub.source_file];
            return (
              <li
                key={sub.source_file}
                className="flex items-start justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
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
                  <p className="mt-1 text-xs text-slate-500">
                    By {sub.author}
                    {sub.dp_count > 0 ? ` · ${sub.dp_count} DP alignments` : ''}
                  </p>
                  {inscriptionId && (
                    <OrdinalLink inscriptionId={inscriptionId} className="mt-1 block" />
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
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
                    <span className="text-xs text-slate-600">No inscription mapped</span>
                  )}
                  <span className="text-xs text-slate-500">{sub.source_file}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
