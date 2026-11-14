import { ELECTION_STEPS, stepIndexOf, type CouncilPhase } from '@/lib/council';

/** Announced → Nominations → Voting → Results, with the current step highlighted. */
export default function ElectionStepper({ phase }: { phase: CouncilPhase }) {
  const current = stepIndexOf(phase);
  const done = phase === 'published';
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Election phases">
      {ELECTION_STEPS.map((step, i) => {
        const state = done || i < current ? 'past' : i === current ? 'current' : 'upcoming';
        const bar =
          state === 'past' ? 'bg-slate-500' : state === 'current' ? 'bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.5)]' : 'bg-slate-800';
        const text = state === 'current' ? 'text-cyan-200' : state === 'past' ? 'text-slate-300' : 'text-slate-500';
        return (
          <li key={step.key} className="min-w-0" aria-current={state === 'current' ? 'step' : undefined}>
            <div className={`h-1.5 rounded-full ${bar}`} />
            <p className={`mt-2 break-words text-[11px] font-medium leading-tight sm:text-sm ${text}`}>
              <span className="text-slate-500">{i + 1}.</span> {step.label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
