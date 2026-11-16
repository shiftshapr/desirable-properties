import {
  META_GOV_DECISIONS,
  META_GOV_OPEN_QUESTIONS,
  META_GOV_SUMMARY,
  type MetaGovTurn,
} from '@/lib/meta-governance-2026-11-16-event';
import { Inline } from './DraftText';
import SessionLabel from './SessionLabel';

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

function Heading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="flex flex-wrap items-center gap-3 border-b border-slate-800 pb-2 text-2xl font-bold text-white">
      {children}
    </h2>
  );
}

/** The meeting record: summary, decisions the meeting raised, open questions. Timestamps link to the transcript. */
export default function SessionSummary({ turns }: { turns: MetaGovTurn[] }) {
  return (
    <>
      <section id="summary" aria-labelledby="summary-heading" className="scroll-mt-24">
        <Heading id="summary-heading">
          Summary <SessionLabel kind="Claude synthesis" />
        </Heading>
        <div className="mt-5 space-y-4 text-base leading-relaxed text-slate-300 sm:text-lg">
          <p className="text-sm text-slate-500">
            Draft, prepared by Claude from the transcript; participants can correct it. Timestamps link to the
            transcript below.
          </p>
          <ul className="list-disc space-y-3 pl-5">
            {META_GOV_SUMMARY.map((item) => (
              <li key={item.slice(0, 40)}>
                <Inline text={item} turns={turns} />
              </li>
            ))}
          </ul>
          <p className="text-sm text-slate-500">Speakers: {SPEAKERS.join(', ')}.</p>
        </div>
      </section>

      <section id="decisions" aria-labelledby="decisions-heading" className="scroll-mt-24">
        <Heading id="decisions-heading">Decisions coming up</Heading>
        <div className="mt-5 space-y-4 text-base leading-relaxed text-slate-300 sm:text-lg">
          <p>The meeting raised eight questions. Their options and the draft ballot are in the draft for review.</p>
          <ol className="list-decimal space-y-1.5 pl-6">
            {META_GOV_DECISIONS.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ol>
        </div>
      </section>

      <section id="open-questions" aria-labelledby="open-questions-heading" className="scroll-mt-24">
        <Heading id="open-questions-heading">Open questions</Heading>
        <ul className="mt-5 list-disc space-y-3 pl-5 text-base leading-relaxed text-slate-300 sm:text-lg">
          {META_GOV_OPEN_QUESTIONS.map((item) => (
            <li key={item.slice(0, 40)}>
              <Inline text={item} turns={turns} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
