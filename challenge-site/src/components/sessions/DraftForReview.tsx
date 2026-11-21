import type { MetaGovTurn } from '@/lib/meta-governance-2026-11-16-event';
import type { SessionDraft } from '@/lib/sessions/session-draft';
import DraftBallot from './DraftBallot';
import DraftDecisions from './DraftDecisions';
import InterimProposal from './InterimProposal';
import ProcessTextDraft from './ProcessTextDraft';
import ReviewActions from './ReviewActions';
import SessionCollapsible from './SessionCollapsible';

/** Meeting-specific headings, from sessionSectionLabels(meeting). */
export type DraftLabels = { draft: string; origins: string; draftBallot: string; processText: string };

const DEFAULT_LABELS: DraftLabels = {
  draft: 'Meeting draft, for review',
  origins: 'Origins of the voting questions',
  draftBallot: 'Draft ballot questions',
  processText: 'How this meeting changed the process page',
};

/**
 * The meeting draft for community review. The page decides `visible` on the server from the clock; when it is
 * false the draft is not passed in at all, so none of it reaches the HTML or the RSC payload. Its parts start
 * closed, showing only their titles.
 */
export default function DraftForReview(
  props: { labels?: DraftLabels } & (
    | { visible: false; opensLabel: string }
    | { visible: true; draft: SessionDraft; turns: MetaGovTurn[]; closesLabel: string; reviewClosed?: boolean }
  ),
) {
  const labels = props.labels ?? DEFAULT_LABELS;
  return (
    <section id="draft" aria-labelledby="draft-heading" className="scroll-mt-24">
      <h2 id="draft-heading" className="border-b border-slate-700 pb-2 text-2xl font-bold text-white">
        {labels.draft}
      </h2>
      {!props.visible ? (
        <p className="mt-5 rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-4 text-lg text-slate-100">
          The draft appears here on {props.opensLabel}.
        </p>
      ) : (
        <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-200">
          <p>
            {props.reviewClosed ? 'Review closed ' : 'Review open until '}
            <strong className="text-white">{props.closesLabel}</strong>. Closing does not mean approval.
          </p>
          {props.reviewClosed ? (
            <SessionCollapsible id="draft-review-how" level={3} title="How corrections were collected">
              <ReviewActions />
            </SessionCollapsible>
          ) : (
            <ReviewActions />
          )}
          <DraftDecisions decisions={props.draft.decisions} turns={props.turns} title={labels.origins} />
          <DraftBallot ballot={props.draft.ballot} title={labels.draftBallot} />
          <InterimProposal proposal={props.draft.interimProposal} turns={props.turns} />
          <ProcessTextDraft text={props.draft.processText} turns={props.turns} title={labels.processText} />
          <p className="text-xs text-slate-400">
            Source: meeting digest, version {props.draft.source.sha256}. {props.draft.source.note}
          </p>
        </div>
      )}
    </section>
  );
}
