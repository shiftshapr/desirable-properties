/** Governance rules that are still open (owner spec §16). Shown as unresolved until the community adopts a rule. */
const OPEN_RULES: Array<[string, string]> = [
  ['Who can vote', 'Voting eligibility, and how it is checked.'],
  ['Quorum', 'Whether a minimum turnout applies, and how much.'],
  ['Thresholds and voting method', 'What share of votes passes a ballot item, and how votes are cast.'],
  ['Council', 'Its remit, its membership and how it is chosen, and the threshold it uses for screening.'],
  ['Transcript access', 'Who can read meeting transcripts, how long they are kept, and whether they are public.'],
  ['Who can attend and contribute', 'Including whether anonymous contributions are allowed.'],
  ['Changes during verification', 'What happens when a correction would change a ballot item substantially.'],
  ['Scope', 'Desirable Properties only, or the wider Meta-Layer and Overweb.'],
  ['Live processing limits', 'Budget and limits for live transcription and AI processing.'],
];

export default function StillToDecide() {
  return (
    <section id="still-to-decide" aria-labelledby="still-to-decide-heading" className="scroll-mt-24">
      <h2 id="still-to-decide-heading" className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">
        Still to be decided by the community
      </h2>
      <p className="mt-4 text-base text-slate-400">
        These rules are not set. Until the community adopts them, nothing on this page assumes an answer.
      </p>
      <ul className="mt-4 space-y-2">
        {OPEN_RULES.map(([rule, detail]) => (
          <li key={rule} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-base text-slate-300">
            <span className="rounded-full border border-slate-700 px-2 py-0.5 text-xs font-medium uppercase tracking-wider text-slate-400">
              Unresolved
            </span>
            <span>
              <strong className="text-white">{rule}.</strong> {detail}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
