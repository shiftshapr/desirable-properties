import type { MetaGovTurn } from '@/lib/meta-governance-2026-11-16-event';
import type { SessionDraft } from '@/lib/sessions/session-draft';
import { Inline } from './DraftText';
import SessionCollapsible from './SessionCollapsible';
import SessionLabel from './SessionLabel';

/** "Origins of the voting questions": the decisions the meeting raised, with the options developed for each. */
export default function DraftDecisions({
  decisions,
  turns,
  title = 'Origins of the voting questions',
}: {
  decisions: SessionDraft['decisions'];
  turns: MetaGovTurn[];
  title?: string;
}) {
  return (
    <SessionCollapsible id="draft-decisions" level={3} title={title} badge={<SessionLabel kind="Claude synthesis" />}>
      <p className="text-sm text-slate-400">
        The questions the meeting raised and the options for each. Timestamps link to the transcript.
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
    </SessionCollapsible>
  );
}
