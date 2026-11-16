import type { MetaGovTurn } from '@/lib/meta-governance-2026-11-16-event';
import type { SessionDraft } from '@/lib/sessions/session-draft';
import DraftBallot from './DraftBallot';
import DraftDecisions from './DraftDecisions';
import InterimProposal from './InterimProposal';
import ProcessTextDraft from './ProcessTextDraft';
import ReviewActions from './ReviewActions';

/**
 * Draft for community review. The page decides `visible` on the server from the clock; when it is false the draft
 * is not passed in at all, so none of it reaches the HTML or the RSC payload.
 */
export default function DraftForReview(
  props: { visible: false; opensLabel: string } | { visible: true; draft: SessionDraft; turns: MetaGovTurn[]; closesLabel: string },
) {
  return (
    <section id="draft" aria-labelledby="draft-heading" className="scroll-mt-24">
      <h2 id="draft-heading" className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">
        Draft for review
      </h2>
      {!props.visible ? (
        <p className="mt-5 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-4 text-lg text-slate-200">
          The draft appears here on {props.opensLabel}.
        </p>
      ) : (
        <div className="mt-5 space-y-10 text-base leading-relaxed text-slate-300">
          <p>
            Check that the record is fair before anything goes further. The review is open until{' '}
            <strong className="text-white">{props.closesLabel}</strong>. After that the council screens the draft;
            the end of the review period does not mean approval.
          </p>
          <ReviewActions />
          <DraftDecisions decisions={props.draft.decisions} turns={props.turns} />
          <DraftBallot ballot={props.draft.ballot} />
          <InterimProposal proposal={props.draft.interimProposal} turns={props.turns} />
          <ProcessTextDraft text={props.draft.processText} turns={props.turns} />
          <p className="text-xs text-slate-500">
            Source: meeting digest, version {props.draft.source.sha256}. {props.draft.source.note}
          </p>
        </div>
      )}
    </section>
  );
}
