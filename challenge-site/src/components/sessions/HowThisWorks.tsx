import { REVIEW_WINDOW_HOURS } from '@/lib/sessions/session-rules';

/** Frame for the occurrence page: who decides what, as four short steps. */
const steps = (reviewHours: number): Array<[string, string]> => [
  ['Claude drafts', 'the summary and ballot from the transcript.'],
  ['Participants correct', `the record in a ${reviewHours}-hour review.`],
  ['The council screens', 'what goes to a vote.'],
  ['The community decides', 'by voting.'],
];

export default function HowThisWorks({ reviewHours = REVIEW_WINDOW_HOURS }: { reviewHours?: number } = {}) {
  return (
    <section aria-labelledby="how-heading">
      <h2 id="how-heading" className="sr-only">
        How this works
      </h2>
      <ol className="grid gap-2 sm:grid-cols-4">
        {steps(reviewHours).map(([who, what], i) => (
          <li key={who} className="rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2.5 text-sm text-slate-300">
            <span className="mr-1.5 font-mono text-cyan-300">{i + 1}</span>
            <strong className="text-white">{who}</strong> {what}
          </li>
        ))}
      </ol>
    </section>
  );
}
