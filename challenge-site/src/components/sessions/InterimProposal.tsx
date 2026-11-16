import type { MetaGovTurn } from '@/lib/meta-governance-2026-11-16-event';
import type { SessionDraft } from '@/lib/sessions/session-draft';
import { Inline } from './DraftText';
import SessionLabel from './SessionLabel';

/** A proposal made after the meeting: not from the transcript, kept visibly separate from the meeting record. */
export default function InterimProposal({ proposal, turns }: { proposal: SessionDraft['interimProposal']; turns: MetaGovTurn[] }) {
  return (
    <div id="draft-interim-council" className="scroll-mt-24 rounded-xl border border-amber-800/50 bg-amber-950/20 px-4 py-4">
      <h3 className="flex flex-wrap items-center gap-2 text-xl font-semibold text-white">
        {proposal.title} <SessionLabel kind="Proposal added after the meeting" />
      </h3>
      <p className="mt-1 text-sm text-slate-400">From {proposal.by}. Not from the transcript.</p>
      <p className="mt-3">
        <Inline text={proposal.text} turns={turns} />
      </p>
    </div>
  );
}
