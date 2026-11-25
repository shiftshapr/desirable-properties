import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import CommunityGroups from '@/components/community/CommunityGroups';
import BallotResultsSummary from '@/components/sessions/BallotResultsSummary';
import DraftForReview from '@/components/sessions/DraftForReview';
import { reviewDocChannels } from '@/components/sessions/ReviewActions';

/** This session's own review doc (anyone with the link can comment), created 24 Nov 2026. */
const REVIEW_DOC_1123 = 'https://docs.google.com/document/d/1r4QFJB36xAZqB3fBFydSIefwIm51bt5aeEgcCJVp30A/edit';
import HowThisWorks from '@/components/sessions/HowThisWorks';
import PhaseTracker from '@/components/sessions/PhaseTracker';
import ProposeForNextSession from '@/components/sessions/ProposeForNextSession';
import SessionAskDeepi from '@/components/sessions/SessionAskDeepi';
import SessionChat from '@/components/sessions/SessionChat';
import SessionCollapsible from '@/components/sessions/SessionCollapsible';
import SessionInvite from '@/components/sessions/SessionInvite';
import SessionLabel from '@/components/sessions/SessionLabel';
import SessionPageShell from '@/components/sessions/SessionPageShell';
import SessionSummary from '@/components/sessions/SessionSummary';
import SessionTranscript from '@/components/sessions/SessionTranscript';
import StillToDecide from '@/components/sessions/StillToDecide';
import { Inline } from '@/components/sessions/DraftText';
import V1Promo from '@/components/v1/V1Promo';
import { SESSION_2026_11_23 as SESSION } from '@/data/sessions/2026-11-23';
import draftData from '@/data/sessions/2026-11-23-draft.json';
import transcript from '@/data/listening-2026-11-23-transcript.json';
import {
  LISTENING_1123_DATE_LABEL,
  LISTENING_1123_DECIDED,
  LISTENING_1123_DECISIONS,
  LISTENING_1123_EVENT_PATH,
  LISTENING_1123_FOLLOW_UPS,
  LISTENING_1123_LUMA_URL,
  LISTENING_1123_OPEN_QUESTIONS,
  LISTENING_1123_SPEAKERS,
  LISTENING_1123_SUMMARY,
  LISTENING_1123_TIME_LABEL,
  type ListeningSection,
  type ListeningTurn,
} from '@/lib/listening-2026-11-23-event';
import { readScreeningView } from '@/lib/screening/screening-store.server';
import { sessionDeepiContext } from '@/lib/sessions/session-deepi-context';
import { meetingShortDate, sessionSectionLabels, type MeetingRef } from '@/lib/sessions/session-labels';
import type { SessionDraft } from '@/lib/sessions/session-draft';
import { isDraftVisible, pacificAndUtc, phaseCallToAction, phaseRows, phaseTone, previewAllowed } from '@/lib/sessions/session-phases';
import { SITE_NAME } from '@/lib/site-metadata';

/** Rendered per request: the draft for review is gated on the server clock (SESSION.draftVisibleAt, unset for now). */
export const dynamic = 'force-dynamic';

const DESCRIPTION =
  'DP Listening Experiment 1/4, 23 November 2026: results of the 16 November ballot, the quorum tie, the interim council and a book club. The record, the draft ballot, the community review, council screening and the vote, all on one page.';

const MEETING: MeetingRef = { date: SESSION.date, meetingTitle: SESSION.meetingTitle, seriesTitle: SESSION.title };
const LABELS = sessionSectionLabels(MEETING);

export const metadata: Metadata = {
  title: `${SESSION.meetingTitle}, ${LISTENING_1123_DATE_LABEL} (${SESSION.title}) | ${SITE_NAME}`,
  description: DESCRIPTION,
  alternates: { canonical: LISTENING_1123_EVENT_PATH },
  // Not for search engines: whether meeting transcripts are public is not yet a settled policy.
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: `${SESSION.meetingTitle}: ${SESSION.title}`,
    description: DESCRIPTION,
    url: LISTENING_1123_EVENT_PATH,
  },
  twitter: { card: 'summary', title: `${SESSION.meetingTitle}: ${SESSION.title}`, description: DESCRIPTION },
};

const linkClass = 'text-cyan-300 hover:text-cyan-200';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function Listening20261123Page({ searchParams }: Props) {
  const host = (await headers()).get('host') || '';
  const params = await searchParams;
  const now = new Date();
  const visible = isDraftVisible(SESSION, now);
  // Staging-only preview of the draft while it is pending host approval (?previewDraft=1). Ignored on production.
  const preview = !visible && params.previewDraft === '1' && previewAllowed(host);

  const { sections, turns } = transcript as { sections: ListeningSection[]; turns: ListeningTurn[] };
  const { rows, current } = phaseRows(SESSION, now);
  const closes = SESSION.phaseHistory.find((e) => e.phase === 'Community verification closed');
  const closesLabel = closes ? pacificAndUtc(closes.at) : '48 hours after opening';
  const cta = phaseCallToAction(current, { closesLabel });
  const reviewClosed = closes ? now >= new Date(closes.at) : false;
  const draft = draftData as SessionDraft;
  // Council screening per question: objections from the draft going visible until the window closes.
  const screeningView = visible || preview ? await readScreeningView(SESSION.slug).catch(() => null) : null;
  const screening = screeningView
    ? {
        slug: SESSION.slug,
        view: screeningView,
        signInHref: `/login?next=${encodeURIComponent(`${LISTENING_1123_EVENT_PATH}#council-screening`)}`,
      }
    : null;

  return (
    <SessionPageShell
      meeting={MEETING}
      dateHref="/roundups/2026-11-23"
      whenLine={
        <>
          {LISTENING_1123_TIME_LABEL} · Zoom ·{' '}
          <a href={LISTENING_1123_LUMA_URL} className={linkClass} rel="noopener noreferrer">
            Luma
          </a>
        </>
      }
      intro="The record, the meeting draft, the review and the vote for this meeting, on one page."
      phaseLabel={current}
      tone={phaseTone(current)}
      stickyCta={cta ? { label: cta.label, href: `#${cta.anchor}` } : null}
      banner={
        preview ? (
          <p className="mb-6 rounded-lg border border-amber-600/60 bg-amber-950/40 px-4 py-2 text-sm text-amber-100">
            Staging preview: the draft below is pending host approval and is not shown on the public page.
          </p>
        ) : null
      }
      headerExtra={
        <>
          <p className="mt-3 text-sm text-slate-300">
            Transcript from the meeting recording, with speakers from Deepi’s live notes, lightly cleaned. Corrections:
            post in the <a href="#session-chat" className={linkClass}>session chat</a>.
          </p>
          {(SESSION.related ?? []).map((r) => (
            <p key={r.href} className="mt-1 text-sm">
              <Link href={r.href} className={linkClass}>
                {r.label}
              </Link>
            </p>
          ))}
        </>
      }
    >
      {/* Book club first (owner, 24 Nov 2026): decided in this meeting, starts at the next session. */}
      <section id="book-club" aria-labelledby="book-club-heading" className="mt-8 scroll-mt-24 rounded-2xl border border-cyan-500/60 bg-cyan-950/30 px-5 py-5 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Decided in this meeting</p>
        <h2 id="book-club-heading" className="mt-2 text-2xl font-bold text-white sm:text-3xl">Book club starts Monday 30 November</h2>
        <p className="mt-3 text-base leading-relaxed text-slate-100">
          The next session opens with a 30-minute book club on <em>The Layered Web</em>. We start with the front matter:
          About this digital monument, the Foreword, the Introduction and the Acknowledgements. Read them before the
          session if you can, and bring a question or insight. Everyone is welcome, whether or not you
          contributed to the book.
        </p>
        <p className="mt-2 text-sm text-slate-300">
          Monday 30 November, 10:00 a.m. Pacific (6:00 p.m. UTC). Salwa El Mais moved it and Leandra Preston seconded.
          How the club picks what to read next is on that session&apos;s agenda.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
          <a href="https://book.desirableproperties.org/viewer/book_cover?ref=pad-1124-bookclub" className="inline-flex rounded-lg bg-cyan-300 px-5 py-2.5 font-semibold text-slate-950 no-underline hover:bg-cyan-200">
            Read the front matter →
          </a>
          <a href="https://luma.com/gra1xda9" className={linkClass} rel="noopener noreferrer">Register on Luma</a>
          <Link href="/roundups/2026-11-30" className={linkClass}>The 30 November session</Link>
        </div>
      </section>

      <ProposeForNextSession pagePath={LISTENING_1123_EVENT_PATH} />

      <div className="mt-8">
        <HowThisWorks />
      </div>

      <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <a href="#book-club" className={linkClass}>Book club</a>
        <a href="#propose-next" className={linkClass}>Propose for next session</a>
        <a href="#phase" className={linkClass}>Where this session is</a>
        <a href="#ballot-results" className={linkClass}>16 November results</a>
        <a href="#invite" className={linkClass}>Invite others</a>
        <a href="#draft" className={linkClass}>Meeting draft</a>
        <a href="#summary" className={linkClass}>Meeting summary</a>
        <a href="#decided-in-meeting" className={linkClass}>Decided in the meeting</a>
        <a href="#open-questions" className={linkClass}>Open questions</a>
        <a href="#still-to-decide" className={linkClass}>Still to be decided</a>
        <a href="#session-chat" className={linkClass}>Session chat</a>
        <a href="#ask-deepi" className={linkClass}>Ask Deepi</a>
        <a href="#transcript" className={linkClass}>Transcript</a>
      </nav>

      <div className="mt-10 space-y-12">
        <PhaseTracker rows={rows} heldFrom={SESSION.heldFrom} heldTo={SESSION.heldTo} closesLabel={closesLabel} />

        {/* The previous session's results, read out at the start of this meeting (shows once they are published). */}
        <BallotResultsSummary
          slug="meta-governance-2026-11-16"
          pageHref="/events/meta-governance-2026-11-16"
          heading="Results of the 16 November ballot"
        />

        <SessionInvite path={LISTENING_1123_EVENT_PATH} />

        <V1Promo separate />

        {visible || preview ? (
          <DraftForReview
            visible
            provenanceSession={SESSION.slug}
            labels={LABELS}
            draft={draft}
            turns={turns}
            closesLabel={closesLabel}
            reviewClosed={reviewClosed}
            pendingApproval={!visible}
            screening={screening}
            reviewChannels={reviewDocChannels(REVIEW_DOC_1123, 'DP listening session, 23 November')}
          />
        ) : (
          <DraftForReview
            visible={false}
            labels={LABELS}
            opensLabel=""
            pendingText="Draft pending host approval. The draft ballot appears here when the host opens the 48-hour review."
          />
        )}

        <section aria-labelledby="record-heading" className="space-y-3">
          <h2 id="record-heading" className="border-b border-slate-700 pb-2 text-2xl font-bold text-white">
            The record of {meetingShortDate(MEETING.date)}
          </h2>
          <SessionSummary
            turns={turns}
            summary={LISTENING_1123_SUMMARY}
            decisions={LISTENING_1123_DECISIONS}
            openQuestions={LISTENING_1123_OPEN_QUESTIONS}
            speakers={LISTENING_1123_SPEAKERS}
            labels={LABELS}
          />

          <SessionCollapsible id="decided-in-meeting" title="Decided in the meeting, and follow-ups" badge={<SessionLabel kind="Claude synthesis" />}>
            <p className="text-sm text-slate-400">
              Agreed in the room, not by ballot. Participants can correct this record.
            </p>
            <ul className="mt-3 list-disc space-y-3 pl-5 text-base leading-relaxed text-slate-200">
              {LISTENING_1123_DECIDED.map((item) => (
                <li key={item.slice(0, 40)}>
                  <Inline text={item} turns={turns} />
                </li>
              ))}
            </ul>
            <h3 className="mt-6 border-b border-slate-700 pb-1.5 text-xl font-semibold text-white">Follow-ups</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-relaxed text-slate-200">
              {LISTENING_1123_FOLLOW_UPS.map((item) => (
                <li key={item.slice(0, 40)}>
                  <Inline text={item} turns={turns} />
                </li>
              ))}
            </ul>
          </SessionCollapsible>

          <SessionCollapsible id="transcript" title={LABELS.transcript}>
            <p className="text-sm text-slate-300">
              From the meeting recording (85 minutes): speech recognition, with speakers from Deepi’s live transcript.
              One entry per speaker turn; names corrected; personal check-ins and a few asides left out; section titles
              added. Two participants who spoke before Deepi rejoined are not identified.
            </p>
            <SessionTranscript sections={sections} turns={turns} />
          </SessionCollapsible>
        </section>

        <StillToDecide />

        {/* Signed-in only; not time-gated. */}
        <SessionChat slug={SESSION.slug} pagePath={LISTENING_1123_EVENT_PATH} heading={LABELS.chat} />

        <SessionAskDeepi
          slug={SESSION.slug}
          title={LABELS.ask}
          context={sessionDeepiContext({
            meeting: MEETING,
            pagePath: LISTENING_1123_EVENT_PATH,
            summary: LISTENING_1123_SUMMARY,
            decisions: LISTENING_1123_DECISIONS,
            openQuestions: LISTENING_1123_OPEN_QUESTIONS,
            turns,
          })}
        />

        <CommunityGroups returnTo={`${LISTENING_1123_EVENT_PATH}#community-groups`} />
      </div>
    </SessionPageShell>
  );
}
