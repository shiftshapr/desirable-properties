import { REVIEW_WINDOW_HOURS } from '@/lib/sessions/session-rules';
import type { MetaGovTurn } from '@/lib/meta-governance-2026-11-16-event';
import type { ScreeningView } from '@/lib/screening/screening-core';
import type { SessionDraft } from '@/lib/sessions/session-draft';
import CouncilScreeningNote from './CouncilScreeningNote';
import DraftBallot from './DraftBallot';
import DraftDecisions from './DraftDecisions';
import { Inline } from './DraftText';
import InterimProposal from './InterimProposal';
import ProcessTextDraft from './ProcessTextDraft';
import ReviewActions, { type ReviewChannels } from './ReviewActions';
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
    | { visible: false; opensLabel: string; pendingText?: string }
    | {
        visible: true;
        draft: SessionDraft;
        turns: MetaGovTurn[];
        closesLabel: string;
        reviewClosed?: boolean;
        /** Where corrections go; defaults to the 16 Nov Google Doc. */
        reviewChannels?: ReviewChannels;
        /** Staging preview of a draft still pending host approval: no review clock, host notes shown. */
        pendingApproval?: boolean;
        /** Council screening, per question (sessions from 23 Nov on). */
        screening?: { slug: string; view: ScreeningView; signInHref: string } | null;
        /** Session slug for the per-option "Proposed by · Seconded by" lines on the draft ballot. */
        provenanceSession?: string;
        /** The draft ballot's banner for the current phase (draftBallotBanner); else the draft file's header. */
        ballotBanner?: string | null;
      }
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
          {props.pendingText ?? <>The draft appears here on {props.opensLabel}.</>}
        </p>
      ) : (
        <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-200">
          {props.pendingApproval ? (
            <p>
              <strong className="text-white">Pending host approval.</strong> The {REVIEW_WINDOW_HOURS}-hour review has not opened; this
              preview shows the draft as Claude prepared it.
            </p>
          ) : (
            <p>
              {props.reviewClosed ? 'Review closed ' : 'Review open until '}
              <strong className="text-white">{props.closesLabel}</strong>. Closing does not mean approval.
            </p>
          )}
          {props.pendingApproval && props.draft.hostNotes?.length ? (
            <div id="draft-host-notes" className="rounded-xl border border-amber-700/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
              <p className="font-semibold uppercase tracking-wide">Notes for the host (staging preview only)</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                {props.draft.hostNotes.map((n) => (
                  <li key={n.slice(0, 40)}>
                    <Inline text={n} turns={props.turns} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {props.pendingApproval ? null : props.reviewClosed ? (
            <SessionCollapsible id="draft-review-how" level={3} title="How corrections were collected">
              <ReviewActions channels={props.reviewChannels} />
            </SessionCollapsible>
          ) : (
            <ReviewActions channels={props.reviewChannels} />
          )}
          <DraftDecisions decisions={props.draft.decisions} turns={props.turns} title={labels.origins} />
          {props.screening ? <CouncilScreeningNote view={props.screening.view} signInHref={props.screening.signInHref} /> : null}
          <DraftBallot
            ballot={props.draft.ballot}
            title={labels.draftBallot}
            screening={props.screening ? { slug: props.screening.slug, view: props.screening.view } : undefined}
            session={props.provenanceSession}
            header={props.ballotBanner}
          />
          {props.draft.interimProposal ? <InterimProposal proposal={props.draft.interimProposal} turns={props.turns} /> : null}
          {props.draft.processText ? (
            <ProcessTextDraft text={props.draft.processText} turns={props.turns} title={labels.processText} />
          ) : null}
          <p className="text-xs text-slate-400">
            Source: meeting digest, version {props.draft.source.sha256}. {props.draft.source.note}
          </p>
        </div>
      )}
    </section>
  );
}
