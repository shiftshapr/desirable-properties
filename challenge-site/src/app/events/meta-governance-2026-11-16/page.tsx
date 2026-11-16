import type { Metadata } from 'next';
import Link from 'next/link';
import SessionTranscript from '@/components/SessionTranscript';
import transcript from '@/data/meta-governance-2026-11-16-transcript.json';
import {
  META_GOV_CORRECTIONS_EMAIL,
  META_GOV_DATE_LABEL,
  META_GOV_DECISIONS,
  META_GOV_EVENT_PATH,
  META_GOV_LUMA_URL,
  META_GOV_OPEN_QUESTIONS,
  META_GOV_SUMMARY,
  META_GOV_TIME_LABEL,
  META_GOV_TITLE,
  parseClock,
  turnAt,
  type MetaGovSection,
  type MetaGovTurn,
} from '@/lib/meta-governance-2026-11-16-event';
import { SITE_NAME } from '@/lib/site-metadata';

const DESCRIPTION =
  'Notes from the DP Meta-Governance listening session on 16 November 2026: a draft summary, what happens next, and Zoom’s automatic transcript.';

export const metadata: Metadata = {
  title: `${META_GOV_TITLE}, ${META_GOV_DATE_LABEL} | ${SITE_NAME}`,
  description: DESCRIPTION,
  alternates: { canonical: META_GOV_EVENT_PATH },
  // Not for search engines: whether meeting transcripts are public is not yet a settled policy.
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: `${META_GOV_TITLE}: session notes`,
    description: DESCRIPTION,
    url: META_GOV_EVENT_PATH,
  },
  twitter: {
    card: 'summary',
    title: `${META_GOV_TITLE}: session notes`,
    description: DESCRIPTION,
  },
};

const SPEAKERS = [
  'Daveed Benjamin (host)',
  'Leandra Preston',
  'Lord M.E.G.A Zion (Zoom name)',
  'Benn Konsynski',
  'Gael Van Weyenbergh',
  'Stella Alvo',
  'Allison Gustavson',
  'Joel Okomoli',
  'Renad Baomar',
];

const linkClass = 'text-cyan-300 hover:text-cyan-200';

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-24">
      <h2 id={`${id}-heading`} className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">
        {title}
      </h2>
      <div className="mt-5 space-y-4 text-base leading-relaxed text-slate-300 sm:text-lg">{children}</div>
    </section>
  );
}

/** Digest text with its "00:06:37" timestamps turned into links to the transcript turn they fall in. */
function WithTimestamps({ text, turns }: { text: string; turns: MetaGovTurn[] }) {
  const parts = text.split(/(\b\d{2}:\d{2}:\d{2}\b)/);
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return part;
        const turn = turnAt(turns, parseClock(part));
        return turn ? (
          <a key={i} href={`#${turn.id}`} className={`font-mono text-[0.9em] tabular-nums ${linkClass}`}>
            {part}
          </a>
        ) : (
          part
        );
      })}
    </>
  );
}

export default function MetaGovernanceSessionPage() {
  const { sections, turns } = transcript as { sections: MetaGovSection[]; turns: MetaGovTurn[] };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
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
        <p className="mt-4 text-lg text-slate-400">
          Notes from the first Monday listening session on how the Desirable Properties and the living book are
          governed. Hosted by Daveed Benjamin (founder, Meta-Layer Initiative and Bridgit.io).{' '}
          <a href={META_GOV_LUMA_URL} className={linkClass} rel="noopener noreferrer">
            Event page on Luma
          </a>
          .
        </p>
        <p className="mt-5 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-base text-slate-300">
          This session was not video recorded. The transcript below is Zoom’s automatic transcript, lightly
          cleaned; it can contain errors. To ask for a correction, email{' '}
          <a href={`mailto:${META_GOV_CORRECTIONS_EMAIL}`} className={linkClass}>
            {META_GOV_CORRECTIONS_EMAIL}
          </a>
          .
        </p>
      </header>

      <nav aria-label="On this page" className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <a href="#next" className={linkClass}>What happens next</a>
        <a href="#summary" className={linkClass}>Summary</a>
        <a href="#decisions" className={linkClass}>Decisions coming up</a>
        <a href="#open-questions" className={linkClass}>Open questions</a>
        <a href="#transcript" className={linkClass}>Transcript</a>
      </nav>

      <div className="mt-12 space-y-14">
        <Section id="next" title="What happens next">
          <p>
            <strong className="text-white">Nothing is decided yet.</strong> This page is a draft record of the
            conversation.
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong className="text-white">Tuesday 17 November, 7:00 a.m. Pacific:</strong> the draft summary and
              draft ballot questions are sent out.
            </li>
            <li>
              <strong className="text-white">24 hours to check them,</strong> until Wednesday 18 November, 7:00 a.m.
              Pacific: say if you were misquoted, if an option is missing, or if a disagreement is not reflected.
            </li>
            <li>
              <strong className="text-white">Then screening</strong> for readiness, before any vote.
            </li>
          </ul>
          <p>Community sessions are now on Mondays at 10:00 a.m. Pacific Time.</p>
        </Section>

        <Section id="summary" title="Summary">
          <p className="text-sm text-slate-500">
            Draft, prepared from the transcript. Timestamps link to the transcript below.
          </p>
          <ul className="list-disc space-y-3 pl-5">
            {META_GOV_SUMMARY.map((item) => (
              <li key={item.slice(0, 40)}>
                <WithTimestamps text={item} turns={turns} />
              </li>
            ))}
          </ul>
          <p className="text-sm text-slate-500">Speakers: {SPEAKERS.join(', ')}.</p>
        </Section>

        <Section id="decisions" title="Decisions coming up">
          <p>
            The draft ballot questions, with their options, are sent on Tuesday. The questions they cover:
          </p>
          <ol className="list-decimal space-y-1.5 pl-6">
            {META_GOV_DECISIONS.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ol>
        </Section>

        <Section id="open-questions" title="Open questions">
          <ul className="list-disc space-y-3 pl-5">
            {META_GOV_OPEN_QUESTIONS.map((item) => (
              <li key={item.slice(0, 40)}>
                <WithTimestamps text={item} turns={turns} />
              </li>
            ))}
          </ul>
        </Section>

        <section id="transcript" aria-labelledby="transcript-heading" className="scroll-mt-24">
          <h2 id="transcript-heading" className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">
            Transcript
          </h2>
          <p className="mt-4 text-sm text-slate-400">
            Zoom’s automatic transcript (88 minutes), one entry per speaker turn, with the time from the start of
            the meeting. Misheard names of participants are corrected; the words are otherwise as transcribed. A few
            private remarks (personal and travel details) are left out. Section titles are added for navigation.
          </p>
          <SessionTranscript sections={sections} turns={turns} />
        </section>
      </div>
    </main>
  );
}
