import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import CommunityGroups from '@/components/community/CommunityGroups';
import ListeningWorkspaceMount from '@/components/listening/ListeningWorkspaceMount';
import DeclineReasons from '@/components/sessions/DeclineReasons';
import DraftForReview from '@/components/sessions/DraftForReview';
import { NOV16_REVIEW_CHANNELS } from '@/components/sessions/ReviewActions';
import HowThisWorks from '@/components/sessions/HowThisWorks';
import PhaseTracker from '@/components/sessions/PhaseTracker';
import SessionAskDeepi from '@/components/sessions/SessionAskDeepi';
import SessionBallot from '@/components/sessions/SessionBallot';
import SessionChat from '@/components/sessions/SessionChat';
import SessionSummary from '@/components/sessions/SessionSummary';
import SessionCollapsible from '@/components/sessions/SessionCollapsible';
import SessionInvite from '@/components/sessions/SessionInvite';
import SessionPageShell from '@/components/sessions/SessionPageShell';
import SessionTranscript from '@/components/sessions/SessionTranscript';
import StillToDecide from '@/components/sessions/StillToDecide';
import V1Promo from '@/components/v1/V1Promo';
import { getMeetingPad } from '@/data/meeting-pads';
import { SESSION_2026_11_16 as SESSION } from '@/data/sessions/2026-11-16';
import { BALLOT_2026_11_16 } from '@/data/sessions/2026-11-16-ballot';
import draftData from '@/data/sessions/2026-11-16-draft.json';
import transcript from '@/data/meta-governance-2026-11-16-transcript.json';
import {
  META_GOV_CORRECTIONS_EMAIL,
  META_GOV_DATE_LABEL,
  META_GOV_DECISIONS,
  META_GOV_EVENT_PATH,
  META_GOV_LUMA_URL,
  META_GOV_OPEN_QUESTIONS,
  META_GOV_SPEAKERS,
  META_GOV_SUMMARY,
  META_GOV_TIME_LABEL,
  META_GOV_TITLE,
  type MetaGovSection,
  type MetaGovTurn,
} from '@/lib/meta-governance-2026-11-16-event';
import { sessionDeepiContext } from '@/lib/sessions/session-deepi-context';
import { meetingShortDate, sessionSectionLabels, type MeetingRef } from '@/lib/sessions/session-labels';
import type { SessionDraft } from '@/lib/sessions/session-draft';
import { effectiveStatus } from '@/lib/ballots/ballot-core';
import { getBallotOverride } from '@/lib/ballots/ballot-store.server';
import { listeningWorkspaceEnabled } from '@/lib/listening/flag';
import { isMeetingPadPublic, meetingPadHref } from '@/lib/meeting-pads/types';
import { isDraftVisible, pacificAndUtc, phaseCallToAction, phaseRows, phaseTone, previewAllowed } from '@/lib/sessions/session-phases';
import { SITE_NAME } from '@/lib/site-metadata';

/** Rendered per request: the draft for review is gated on the server clock (SESSION.draftVisibleAt). */
export const dynamic = 'force-dynamic';

const DESCRIPTION =
  'The DP Meta-Governance listening session of 16 November 2026: the record, the draft ballot, the community review, council screening and the vote, all on one page.';

const MEETING: MeetingRef = { date: SESSION.date, meetingTitle: SESSION.meetingTitle, seriesTitle: SESSION.title };
const LABELS = sessionSectionLabels(MEETING);

export const metadata: Metadata = {
  title: `${SESSION.meetingTitle}, ${META_GOV_DATE_LABEL} (${META_GOV_TITLE}) | ${SITE_NAME}`,
  description: DESCRIPTION,
  alternates: { canonical: META_GOV_EVENT_PATH },
  // Not for search engines: whether meeting transcripts are public is not yet a settled policy.
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: `${SESSION.meetingTitle}: ${META_GOV_TITLE}`,
    description: DESCRIPTION,
    url: META_GOV_EVENT_PATH,
  },
  twitter: { card: 'summary', title: `${SESSION.meetingTitle}: ${META_GOV_TITLE}`, description: DESCRIPTION },
};

const linkClass = 'text-cyan-300 hover:text-cyan-200';

/** SESSION.related, without links to meeting pads that are not public. */
function relatedLinks() {
  const prefix = meetingPadHref('');
  return (SESSION.related ?? []).filter((r) => {
    if (!r.href.startsWith(prefix)) return true;
    const pad = getMeetingPad(r.href.slice(prefix.length));
    return pad ? isMeetingPadPublic(pad) : false;
  });
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function MetaGovernanceSessionPage({ searchParams }: Props) {
  const host = (await headers()).get('host') || '';
  const params = await searchParams;
  // Staging-only preview of the state once the review has opened (?previewDraft=1). Ignored on production.
  const preview = params.previewDraft === '1' && previewAllowed(host);
  const realNow = new Date();
  const opensAt = new Date(SESSION.draftVisibleAt ?? 0);
  const now = preview && realNow < opensAt ? new Date(opensAt.getTime() + 60_000) : realNow;

  const { sections, turns } = transcript as { sections: MetaGovSection[]; turns: MetaGovTurn[] };
  const { rows, current } = phaseRows(SESSION, now);
  const visible = isDraftVisible(SESSION, now);
  const closes = SESSION.phaseHistory.find((e) => e.phase === 'Community verification closed');
  // The Vote section shows from the ballot's opensAt (staging: always, as a review copy).
  const staging = previewAllowed(host);
  const ballotOverride = await getBallotOverride(BALLOT_2026_11_16.slug).catch(() => null);
  const showBallot = staging || effectiveStatus(BALLOT_2026_11_16, ballotOverride, realNow) !== 'not_open';
  const closesLabel = pacificAndUtc(BALLOT_2026_11_16.closesAt);
  const cta = phaseCallToAction(current, { closesLabel });
  const reviewClosed = closes ? now >= new Date(closes.at) : false;

  return (
    <>
    <SessionPageShell
      meeting={MEETING}
      dateHref="/roundups/2026-11-16"
      whenLine={
        <>
          {META_GOV_TIME_LABEL} · Zoom ·{' '}
          <a href={META_GOV_LUMA_URL} className={linkClass} rel="noopener noreferrer">
            Luma
          </a>
        </>
      }
      intro="The record, the meeting draft, the review and the vote for this meeting, on one page."
      phaseLabel={current}
      tone={phaseTone(current)}
      stickyCta={showBallot && current === 'Voting open' ? { label: 'Vote', href: '#vote' } : cta ? { label: cta.label, href: `#${cta.anchor}` } : null}
      banner={
        preview ? (
          <p className="mb-6 rounded-lg border border-amber-600/60 bg-amber-950/40 px-4 py-2 text-sm text-amber-100">
            Staging preview: this page as it will look once the review opens ({SESSION.draftVisibleAt ? pacificAndUtc(SESSION.draftVisibleAt) : 'not scheduled'}).
          </p>
        ) : null
      }
      headerExtra={
        <>
          <p className="mt-3 text-sm text-slate-300">
            Not video recorded; the transcript is Zoom’s, lightly cleaned. Corrections:{' '}
            <a href={`mailto:${META_GOV_CORRECTIONS_EMAIL}`} className={linkClass}>
              {META_GOV_CORRECTIONS_EMAIL}
            </a>
            .
          </p>
          {relatedLinks().map((r) => (
            <p key={r.href} className="mt-1 text-sm">
              <Link href={r.href} className={linkClass}>
                {r.label}
              </Link>
            </p>
          ))}
        </>
      }
    >
      <div className="mt-8">
        {/* Kept as this page showed it (before per-question screening on the session page, 24 Nov). */}
        <HowThisWorks
          reviewHours={24}
          screeningStep="what goes to a vote: a question goes forward unless a council member objects in writing within a day."
        />
      </div>

      <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <a href="#phase" className={linkClass}>Where this session is</a>
        {showBallot ? <a href="#vote" className={linkClass}>Vote</a> : null}
        <a href="#invite" className={linkClass}>Invite others</a>
        <a href="#draft" className={linkClass}>Meeting draft</a>
        <a href="#summary" className={linkClass}>Meeting summary</a>
        <a href="#declines" className={linkClass}>Why proposals were declined</a>
        <a href="#still-to-decide" className={linkClass}>Still to be decided</a>
        <a href="#session-chat" className={linkClass}>Session chat</a>
        <a href="#ask-deepi" className={linkClass}>Ask Deepi</a>
        <a href="#transcript" className={linkClass}>Transcript</a>
        <a href="#watch-v1" className={linkClass}>Share the platform</a>
        {listeningWorkspaceEnabled() ? (
          <a href="#workspace" className={linkClass}>Meeting workspace (staging preview)</a>
        ) : null}
      </nav>

      <div className="mt-10 space-y-12">
        <PhaseTracker rows={rows} heldFrom={SESSION.heldFrom} heldTo={SESSION.heldTo} closesLabel={closesLabel} />

        <SessionBallot ballot={BALLOT_2026_11_16} staging={staging} heading={LABELS.vote} />

        <SessionInvite path={META_GOV_EVENT_PATH} />

        {/* After the Vote on purpose: voting stays the page's main call to action. Separate panel: not this meeting. */}
        <V1Promo separate />

        {visible ? (
          <DraftForReview
            visible
            reviewChannels={NOV16_REVIEW_CHANNELS}
            labels={LABELS}
            draft={draftData as SessionDraft}
            turns={turns}
            closesLabel={closes ? pacificAndUtc(closes.at) : '24 hours after opening'}
            reviewClosed={reviewClosed}
          />
        ) : (
          <DraftForReview visible={false} labels={LABELS} opensLabel="Tuesday 17 November at 7:00 AM Pacific" />
        )}

        <section aria-labelledby="record-heading" className="space-y-3">
          <h2 id="record-heading" className="border-b border-slate-700 pb-2 text-2xl font-bold text-white">
            The record of {meetingShortDate(MEETING.date)}
          </h2>
          <SessionSummary
            turns={turns}
            summary={META_GOV_SUMMARY}
            decisions={META_GOV_DECISIONS}
            openQuestions={META_GOV_OPEN_QUESTIONS}
            speakers={META_GOV_SPEAKERS}
            labels={LABELS}
          />

          {/* Not part of the draft ballot, so shown at all times (not gated on SESSION.draftVisibleAt). */}
          <DeclineReasons correctionsEmail={META_GOV_CORRECTIONS_EMAIL} />

          <SessionCollapsible id="transcript" title={LABELS.transcript}>
            <p className="text-sm text-slate-300">
              Zoom’s automatic transcript (88 minutes), one entry per speaker turn. Names corrected; a few private
              remarks left out; section titles added.
            </p>
            <SessionTranscript sections={sections} turns={turns} />
          </SessionCollapsible>
        </section>

        <StillToDecide />

        {/* Signed-in only; not time-gated and not behind the listening-workspace flag. */}
        <SessionChat slug={SESSION.slug} pagePath={META_GOV_EVENT_PATH} heading={LABELS.chat} />

        <SessionAskDeepi
          slug={SESSION.slug}
          title={LABELS.ask}
          context={sessionDeepiContext({
            meeting: MEETING,
            pagePath: META_GOV_EVENT_PATH,
            summary: META_GOV_SUMMARY,
            decisions: META_GOV_DECISIONS,
            openQuestions: META_GOV_OPEN_QUESTIONS,
            ballot: BALLOT_2026_11_16,
            turns,
          })}
        />

        <CommunityGroups returnTo={`${META_GOV_EVENT_PATH}#community-groups`} />
      </div>
    </SessionPageShell>
    {/* Staging only (feature flag): the live meeting record for this occurrence. Renders nothing in production. */}
    <ListeningWorkspaceMount slug="meta-governance-2026-11-16" pagePhaseTracker pageTranscriptAnchor="#transcript" />
    </>
  );
}
