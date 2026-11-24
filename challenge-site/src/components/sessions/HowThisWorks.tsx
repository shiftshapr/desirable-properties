import { REVIEW_WINDOW_HOURS } from '@/lib/sessions/session-rules';

/** Frame for the occurrence page: who decides what, as four short steps. */
/** The screening step in plain words (SCREENING_RULE in session-rules.ts). */
export const SCREENING_STEP =
  'each question: it goes to the vote unless a council member objects to it on this page, with a reason, within a day of the review closing.';

const steps = (reviewHours: number, screening: string): Array<[string, string]> => [
  ['Claude drafts', 'the summary and ballot from the transcript.'],
  ['Participants correct', `the record in a ${reviewHours}-hour review.`],
  ['The council screens', screening],
  ['The community decides', 'by voting.'],
];

export default function HowThisWorks({
  reviewHours = REVIEW_WINDOW_HOURS,
  screeningStep = SCREENING_STEP,
}: { reviewHours?: number; screeningStep?: string } = {}) {
  return (
    <section aria-labelledby="how-heading">
      <h2 id="how-heading" className="sr-only">
        How this works
      </h2>
      <ol className="grid gap-2 sm:grid-cols-4">
        {steps(reviewHours, screeningStep).map(([who, what], i) => (
          <li key={who} className="rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2.5 text-sm text-slate-300">
            <span className="mr-1.5 font-mono text-cyan-300">{i + 1}</span>
            <strong className="text-white">{who}</strong> {what}
          </li>
        ))}
      </ol>
    </section>
  );
}
