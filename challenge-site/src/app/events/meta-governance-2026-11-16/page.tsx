import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import ListeningWorkspaceMount from '@/components/listening/ListeningWorkspaceMount';
import DraftForReview from '@/components/sessions/DraftForReview';
import HowThisWorks from '@/components/sessions/HowThisWorks';
import PhaseTracker from '@/components/sessions/PhaseTracker';
import SessionSummary from '@/components/sessions/SessionSummary';
import SessionTranscript from '@/components/sessions/SessionTranscript';
import StillToDecide from '@/components/sessions/StillToDecide';
import { SESSION_2026_11_16 as SESSION } from '@/data/sessions/2026-11-16';
import draftData from '@/data/sessions/2026-11-16-draft.json';
import transcript from '@/data/meta-governance-2026-11-16-transcript.json';
import {
  META_GOV_CORRECTIONS_EMAIL,
  META_GOV_DATE_LABEL,
  META_GOV_EVENT_PATH,
  META_GOV_LUMA_URL,
  META_GOV_TIME_LABEL,
  META_GOV_TITLE,
  type MetaGovSection,
  type MetaGovTurn,
} from '@/lib/meta-governance-2026-11-16-event';
import type { SessionDraft } from '@/lib/sessions/session-draft';
import { listeningWorkspaceEnabled } from '@/lib/listening/flag';
import { isDraftVisible, pacificAndUtc, phaseRows, previewAllowed } from '@/lib/sessions/session-phases';
import { SITE_NAME } from '@/lib/site-metadata';

/** Rendered per request: the draft for review is gated on the server clock (SESSION.draftVisibleAt). */
export const dynamic = 'force-dynamic';

const DESCRIPTION =
  'The DP Meta-Governance listening session of 16 November 2026: the record, the draft ballot, the community review, council screening and the vote, all on one page.';

export const metadata: Metadata = {
  title: `${META_GOV_TITLE}, ${META_GOV_DATE_LABEL} | ${SITE_NAME}`,
  description: DESCRIPTION,
  alternates: { canonical: META_GOV_EVENT_PATH },
  // Not for search engines: whether meeting transcripts are public is not yet a settled policy.
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: META_GOV_TITLE,
    description: DESCRIPTION,
    url: META_GOV_EVENT_PATH,
  },
  twitter: { card: 'summary', title: META_GOV_TITLE, description: DESCRIPTION },
};

const linkClass = 'text-cyan-300 hover:text-cyan-200';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function MetaGovernanceSessionPage({ searchParams }: Props) {
  const host = (await headers()).get('host') || '';
  const params = await searchParams;
  // Staging-only preview of the state once the review has opened (?previewDraft=1). Ignored on production.
  const preview = params.previewDraft === '1' && previewAllowed(host);
  const realNow = new Date();
  const opensAt = new Date(SESSION.draftVisibleAt);
  const now = preview && realNow < opensAt ? new Date(opensAt.getTime() + 60_000) : realNow;

  const { sections, turns } = transcript as { sections: MetaGovSection[]; turns: MetaGovTurn[] };
  const { rows } = phaseRows(SESSION, now);
  const visible = isDraftVisible(SESSION, now);
  const closes = SESSION.phaseHistory.find((e) => e.phase === 'Community verification closed');

  return (
    <>
    <main className="mx-auto w-full min-w-0 max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      {preview ? (
        <p className="mb-6 rounded-lg border border-amber-600/60 bg-amber-950/40 px-4 py-2 text-sm text-amber-100">
          Staging preview: this page as it will look once the review opens ({pacificAndUtc(SESSION.draftVisibleAt)}).
        </p>
      ) : null}
      <p className="text-sm">
        <Link href="/events" className={linkClass}>
          ← Events
        </Link>
      </p>

      <header className="mt-6">
        <p className="text-sm font-medium uppercase tracking-[0.15em] text-cyan-400">
          {META_GOV_DATE_LABEL} · {META_GOV_TIME_LABEL} · Zoom
        </p>
        <h1 className="mt-3 text-3xl font-bold text-white sm:text-5xl">{META_GOV_TITLE}</h1>
        <p className="mt-4 text-lg text-slate-300">
          Everything about this session lives here: the record, the draft ballot, the review, the screening and the
          vote.
        </p>
        <p className="mt-3 text-base text-slate-400">
          The first Monday listening session on how the Desirable Properties and the living book are governed. Hosted
          by Daveed Benjamin (founder, Meta-Layer Initiative and Bridgit.io). Community sessions are on Mondays at
          10:00 a.m. Pacific Time.{' '}
          <a href={META_GOV_LUMA_URL} className={linkClass} rel="noopener noreferrer">
            Event page on Luma
          </a>
          .
        </p>
        <p className="mt-5 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-base text-slate-300">
          This session was not video recorded. The transcript below is Zoom’s automatic transcript, lightly cleaned;
          it can contain errors. To ask for a correction, email{' '}
          <a href={`mailto:${META_GOV_CORRECTIONS_EMAIL}`} className={linkClass}>
            {META_GOV_CORRECTIONS_EMAIL}
          </a>
          .
        </p>
      </header>

      <div className="mt-8">
        <HowThisWorks />
      </div>

      <nav aria-label="On this page" className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <a href="#phase" className={linkClass}>Where this session is</a>
        <a href="#draft" className={linkClass}>Draft for review</a>
        <a href="#summary" className={linkClass}>Summary</a>
        <a href="#open-questions" className={linkClass}>Open questions</a>
        <a href="#still-to-decide" className={linkClass}>Still to be decided</a>
        <a href="#transcript" className={linkClass}>Transcript</a>
        {listeningWorkspaceEnabled() ? (
          <a href="#workspace" className={linkClass}>Meeting workspace (staging preview)</a>
        ) : null}
      </nav>

      <div className="mt-12 space-y-14">
        <PhaseTracker rows={rows} heldFrom={SESSION.heldFrom} heldTo={SESSION.heldTo} />

        {visible ? (
          <DraftForReview
            visible
            draft={draftData as SessionDraft}
            turns={turns}
            closesLabel={closes ? pacificAndUtc(closes.at) : '24 hours after opening'}
          />
        ) : (
          <DraftForReview visible={false} opensLabel="Tuesday 17 November at 7:00 AM Pacific" />
        )}

        <SessionSummary turns={turns} />

        <StillToDecide />

        <section id="transcript" aria-labelledby="transcript-heading" className="scroll-mt-24">
          <h2 id="transcript-heading" className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">
            Transcript
          </h2>
          <p className="mt-4 text-sm text-slate-400">
            Zoom’s automatic transcript (88 minutes), one entry per speaker turn, with the time from the start of the
            meeting. Misheard names of participants are corrected; the words are otherwise as transcribed. A few
            private remarks (personal and travel details) are left out. Section titles are added for navigation.
          </p>
          <SessionTranscript sections={sections} turns={turns} />
        </section>
      </div>
    </main>
    {/* Staging only (feature flag): the live meeting record for this occurrence. Renders nothing in production. */}
    <ListeningWorkspaceMount slug="meta-governance-2026-11-16" pagePhaseTracker pageTranscriptAnchor="#transcript" />
    </>
  );
}
