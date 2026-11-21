import type { MetaGovTurn } from '@/lib/meta-governance-2026-11-16-event';
import { Inline } from './DraftText';
import SessionCollapsible from './SessionCollapsible';
import SessionLabel from './SessionLabel';

type Props = {
  turns: MetaGovTurn[];
  summary: readonly string[];
  decisions: readonly string[];
  openQuestions: readonly string[];
  speakers: readonly string[];
  /** Meeting-specific titles, from sessionSectionLabels(meeting). */
  labels?: { summary: string; decisions: string; openQuestions: string };
};

/**
 * The meeting record in one collapsed section: summary, the decisions coming up and the open questions.
 * The old anchors (#summary, #decisions, #open-questions) still work and open it. Timestamps link to the transcript.
 */
export default function SessionSummary({ turns, summary, decisions, openQuestions, speakers, labels }: Props) {
  const l = labels ?? { summary: 'Meeting summary', decisions: 'Decisions coming up', openQuestions: 'Open questions' };
  return (
    <SessionCollapsible id="summary" title={l.summary} badge={<SessionLabel kind="Claude synthesis" />}>
      <div className="space-y-4 text-base leading-relaxed text-slate-200">
        <p className="text-sm text-slate-400">Drafted by Claude from the transcript; participants can correct it.</p>
        <ul className="list-disc space-y-3 pl-5">
          {summary.map((item) => (
            <li key={item.slice(0, 40)}>
              <Inline text={item} turns={turns} />
            </li>
          ))}
        </ul>
        <p className="text-sm text-slate-400">Speakers: {speakers.join(', ')}.</p>
      </div>

      <div id="decisions" className="mt-8 scroll-mt-24">
        <h3 className="border-b border-slate-700 pb-1.5 text-xl font-semibold text-white">{l.decisions}</h3>
        <ol className="mt-3 list-decimal space-y-1.5 pl-6 text-base leading-relaxed text-slate-200">
          {decisions.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ol>
      </div>

      <div id="open-questions" className="mt-8 scroll-mt-24">
        <h3 className="border-b border-slate-700 pb-1.5 text-xl font-semibold text-white">{l.openQuestions}</h3>
        <ul className="mt-3 list-disc space-y-3 pl-5 text-base leading-relaxed text-slate-200">
          {openQuestions.map((item) => (
            <li key={item.slice(0, 40)}>
              <Inline text={item} turns={turns} />
            </li>
          ))}
        </ul>
      </div>
    </SessionCollapsible>
  );
}
