import type { SessionDraft } from '@/lib/sessions/session-draft';
import SessionLabel from './SessionLabel';

/** Draft ballot questions as sent for review; the corrected ballot is in SessionBallot. */
export default function DraftBallot({ ballot }: { ballot: SessionDraft['ballot'] }) {
  return (
    <div id="draft-ballot" className="scroll-mt-24">
      <h3 className="flex flex-wrap items-center gap-2 text-xl font-semibold text-white">
        Draft ballot questions <SessionLabel kind="Claude synthesis" />
      </h3>
      <p className="mt-3 rounded-lg border border-amber-700/50 bg-amber-950/30 px-3 py-2 text-sm font-semibold uppercase tracking-wide text-amber-200">
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
          </li>
        ))}
      </ol>
    </div>
  );
}
