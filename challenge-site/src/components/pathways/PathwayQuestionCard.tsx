import TrackedLink from '@/components/TrackedLink';
import type { PathwayQuestion } from '@/lib/pathways';

type Props = {
  question: PathwayQuestion;
  index: number;
  pathwaySlug: string;
};

export default function PathwayQuestionCard({ question, index, pathwaySlug }: Props) {
  return (
    <article
      id={question.id}
      className="scroll-mt-24 rounded-xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        Question {index}
      </p>
      <h3 className="mt-2 text-xl font-semibold text-white sm:text-2xl">{question.title}</h3>
      <div className="mt-4 space-y-3 text-base leading-relaxed text-slate-300">
        {question.framing.map((paragraph) => (
          <p key={paragraph.slice(0, 48)}>{paragraph}</p>
        ))}
      </div>

      <div className="mt-5">
        <h4 className="text-sm font-semibold text-slate-200">Related Desirable Properties</h4>
        <ul className="mt-3 flex flex-wrap gap-2">
          {question.dpLinks.map((dp) => (
            <li key={dp.id}>
              <TrackedLink
                href={dp.href}
                eventName="pathway_dp_click"
                eventPayload={{ pathway: pathwaySlug, dp: dp.id, question: question.id }}
                className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-sm text-cyan-200 hover:border-cyan-700 hover:text-cyan-100"
              >
                <span className="mr-1.5 font-mono text-xs text-slate-500">{dp.id}</span>
                {dp.name}
              </TrackedLink>
            </li>
          ))}
        </ul>
      </div>

      {question.candidateConcept ? (
        <div className="mt-5 rounded-lg border border-amber-900/40 bg-amber-950/20 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-200/80">
            Candidate concept
          </p>
          <p className="mt-1 font-medium text-amber-50">{question.candidateConcept.name}</p>
          <p className="mt-2 text-sm leading-relaxed text-amber-100/80">
            {question.candidateConcept.description}
          </p>
        </div>
      ) : null}

      <p className="mt-5 border-t border-slate-800 pt-4 text-sm leading-relaxed text-slate-400">
        <span className="font-medium text-slate-300">What might be missing?</span>{' '}
        {question.prompt}
      </p>
    </article>
  );
}
