import type { ScreeningView } from '@/lib/screening/screening-core';
import type { SessionDraft } from '@/lib/sessions/session-draft';
import ScreeningQuestionPanel from './ScreeningQuestionPanel';
import SessionCollapsible from './SessionCollapsible';
import SessionLabel from './SessionLabel';

/** Draft ballot questions as sent for review; the corrected ballot is in SessionBallot. */
export default function DraftBallot({
  ballot,
  title = 'Draft ballot questions',
  screening,
}: {
  ballot: SessionDraft['ballot'];
  /** Meeting-specific: sessionSectionLabels(meeting).draftBallot. */
  title?: string;
  /** Council screening per question (sessions from 23 Nov on). Without it the list renders as before. */
  screening?: { slug: string; view: ScreeningView };
}) {
  return (
    <SessionCollapsible id="draft-ballot" level={3} title={title} badge={<SessionLabel kind="Claude synthesis" />}>
      <p className="rounded-lg border border-amber-700/50 bg-amber-950/30 px-3 py-2 text-sm font-semibold uppercase tracking-wide text-amber-200">
        {ballot.header}
      </p>
      <ol className="mt-4 space-y-4">
        {ballot.questions.map((q) => (
          <li key={q.n} className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
            <p className="text-sm text-slate-400">
              <em>Context: {q.context}</em>
              {q.label ? <> <SessionLabel kind={q.label} /></> : null}
            </p>
            <p className="mt-1 font-semibold text-white">
              {q.n}. {q.question}
            </p>
            <ul className="mt-2 flex flex-wrap gap-2" aria-label="Draft options">
              {q.options.map((o) => (
                <li key={o} className="rounded-md border border-slate-700 px-2 py-1 text-sm text-slate-300">
                  {o}
                </li>
              ))}
            </ul>
            {screening
              ? (() => {
                  const sq = screening.view.questions.find((x) => x.n === q.n);
                  return sq ? (
                    <ScreeningQuestionPanel
                      slug={screening.slug}
                      initial={sq}
                      status={screening.view.screening.status}
                      member={screening.view.viewer.member}
                    />
                  ) : null;
                })()
              : null}
          </li>
        ))}
      </ol>
    </SessionCollapsible>
  );
}
