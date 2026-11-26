import type { ScreeningView } from "@/lib/screening/screening-core";
import { provenanceFor } from "@/lib/sessions/option-provenance";
import {
  draftOptionKey,
  withScreening,
} from "@/lib/sessions/option-provenance-core";
import type { SessionDraft } from "@/lib/sessions/session-draft";
import OptionProvenanceLine from "./OptionProvenanceLine";
import ScreeningQuestionPanel from "./ScreeningQuestionPanel";
import SessionCollapsible from "./SessionCollapsible";
import SessionLabel from "./SessionLabel";

/** Draft ballot questions as sent for review; the corrected ballot is in SessionBallot. */
export default function DraftBallot({
  ballot,
  title = "Draft ballot questions",
  screening,
  session,
  header,
}: {
  ballot: SessionDraft["ballot"];
  /** Meeting-specific: sessionSectionLabels(meeting).draftBallot. */
  title?: string;
  /** Council screening per question (sessions from 23 Nov on). Without it the list renders as before. */
  screening?: { slug: string; view: ScreeningView };
  /** Session slug: shows who proposed and seconded each option (src/data/sessions/option-provenance.ts). */
  session?: string;
  /** Banner derived from the session's phase (draftBallotBanner); falls back to the draft file's header. */
  header?: string | null;
}) {
  return (
    <SessionCollapsible
      id="draft-ballot"
      level={3}
      title={title}
      badge={<SessionLabel kind="Claude synthesis" />}
    >
      <p className="rounded-lg border border-amber-700/50 bg-amber-950/30 px-3 py-2 text-sm font-semibold uppercase tracking-wide text-amber-200">
        {header || ballot.header}
      </p>
      <ol className="mt-4 space-y-4">
        {ballot.questions.map((q) => {
          const screened = screening?.view.questions.find(
            (x) => x.n === q.n,
          )?.outcome;
          const provenance = session
            ? q.options.flatMap((label, i) => {
                const key = draftOptionKey(label, i);
                const rec = key ? provenanceFor(session, `q${q.n}`, key) : null;
                return rec
                  ? [{ label, rec: withScreening(rec, screened) }]
                  : [];
              })
            : [];
          return (
            <li
              key={q.n}
              className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3"
            >
              <p className="text-sm text-slate-400">
                <em>Context: {q.context}</em>
                {q.label ? (
                  <>
                    {" "}
                    <SessionLabel kind={q.label} />
                  </>
                ) : null}
              </p>
              {q.correction ? (
                <p className="mt-1 text-sm text-amber-200">{q.correction}</p>
              ) : null}
              <p className="mt-1 font-semibold text-white">
                {q.n}. {q.question}
              </p>
              <ul
                className="mt-2 flex flex-wrap gap-2"
                aria-label="Draft options"
              >
                {q.options.map((o) => (
                  <li
                    key={o}
                    className="rounded-md border border-slate-700 px-2 py-1 text-sm text-slate-300"
                  >
                    {o}
                  </li>
                ))}
              </ul>
              {provenance.length ? (
                <ul
                  className="mt-2 space-y-1"
                  aria-label="Who proposed each option"
                >
                  {provenance.map(({ label, rec }) => (
                    <li key={rec.id} className="text-xs text-slate-400">
                      <span className="text-slate-300">{label}:</span>{" "}
                      <OptionProvenanceLine rec={rec} className="inline" />
                    </li>
                  ))}
                </ul>
              ) : null}
              {screening
                ? (() => {
                    const sq = screening.view.questions.find(
                      (x) => x.n === q.n,
                    );
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
          );
        })}
      </ol>
    </SessionCollapsible>
  );
}
