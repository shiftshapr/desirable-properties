import type { MetaGovTurn } from '@/lib/meta-governance-2026-11-16-event';
import type { SessionDraft } from '@/lib/sessions/session-draft';
import { Inline } from './DraftText';
import SessionLabel from './SessionLabel';

/** The decisions the meeting raised, with the options developed for each. */
export default function DraftDecisions({ decisions, turns }: { decisions: SessionDraft['decisions']; turns: MetaGovTurn[] }) {
  return (
    <div id="draft-decisions" className="scroll-mt-24">
      <h3 className="flex flex-wrap items-center gap-2 text-xl font-semibold text-white">
        Decisions and options <SessionLabel kind="Claude synthesis" />
      </h3>
      <p className="mt-2 text-sm text-slate-400">
        Options are labelled <em>Participant proposal</em> where the record attributes them to a participant.
        Timestamps link to the transcript.
      </p>
      <ol className="mt-4 space-y-5">
        {decisions.map((d) => (
          <li key={d.n} className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-4">
            <p className="font-semibold text-white">
              {d.n}. {d.title}
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              {d.options.map((o) => (
                <li key={o.text} className={o.note ? 'list-none -ml-5 text-slate-400' : undefined}>
                  <Inline text={o.text} turns={turns} />
                  {o.label ? <> <SessionLabel kind={o.label} /></> : null}
                </li>
              ))}
            </ul>
            {d.raisedBy ? (
              <p className="mt-2 text-sm text-slate-400">
                <Inline text={d.raisedBy} turns={turns} />
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
