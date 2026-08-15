'use client';

import type { ContributionRecordHint, ContributionSet, LedgerProposal } from '@/lib/hermesContribution';
import { ledgerSetForRecord, proposalStatusBadge } from '@/lib/hermesContribution';

interface HermesContributionLedgerProps {
  recordHint: ContributionRecordHint;
  contributionSets: ContributionSet[];
  recordMarkdown?: string;
  onRevise?: (set: ContributionSet, proposal: LedgerProposal, recordMarkdown: string) => void;
}

export default function HermesContributionLedger({
  recordHint,
  contributionSets,
  recordMarkdown = '',
  onRevise,
}: HermesContributionLedgerProps) {
  const set = ledgerSetForRecord(contributionSets, recordHint);
  if (!set?.proposals?.length) return null;

  return (
    <div className="mb-3 rounded-lg border border-emerald-800/50 bg-emerald-950/30 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300/90">
        Filing set · {set.draftRef}
        <span className="ml-2 font-normal normal-case text-slate-400">
          {set.mode === 'draft' ? 'saved as drafts' : 'published'}
        </span>
        {set.supersedesMessageId ? (
          <span className="ml-2 font-normal normal-case text-amber-300/90">
            · revision
          </span>
        ) : null}
      </p>
      <ul className="mt-2 space-y-1.5">
        {set.proposals.map((proposal) => (
          <li
            key={proposal.proposalId}
            className="flex flex-wrap items-center gap-2 text-xs text-slate-200"
          >
            <span className="inline-flex rounded-full border border-slate-600/80 bg-slate-900/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-300">
              {proposalStatusBadge(proposal.status)}
            </span>
            <span>{proposal.label}</span>
            {proposal.status === 'published' && proposal.canopiMessageId && onRevise ? (
              <button
                type="button"
                onClick={() => onRevise(set, proposal, recordMarkdown)}
                className="text-amber-300 hover:underline"
              >
                Revise
              </button>
            ) : null}
            {proposal.href ? (
              <a
                href={proposal.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:underline"
              >
                Open in Discuss
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
