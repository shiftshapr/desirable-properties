import {
  DEFAULT_PHASE_ANCHORS,
  pacificAndUtc,
  phaseCallToAction,
  phaseNowLabel,
  phaseTone,
  type PhaseClock,
  type PhaseRow,
  type SessionPhase,
} from '@/lib/sessions/session-phases';
import { PHASE_TONE } from './phase-tone';

type Props = {
  rows: PhaseRow[];
  heldFrom: string;
  heldTo: string;
  /** Section each step links to; defaults to DEFAULT_PHASE_ANCHORS. */
  anchors?: Partial<Record<SessionPhase, string>>;
  /** For the current phase's call to action ("Voting is open until …"). */
  closesLabel?: string;
  /** Clock facts for time-driven labels (e.g. the council screening window). */
  clock?: PhaseClock;
};

/**
 * Where this occurrence is in the post-meeting process. Every step links to its section (smooth scroll, offset for
 * the sticky headers); the current step is coloured by phase and its call to action stays open under the list.
 */
export default function PhaseTracker({ rows, heldFrom, heldTo, anchors, closesLabel, clock }: Props) {
  const links = { ...DEFAULT_PHASE_ANCHORS, ...anchors };
  const current = rows.find((r) => r.state === 'current')?.phase ?? null;
  const tone = PHASE_TONE[phaseTone(current)];
  const cta = phaseCallToAction(current, { closesLabel, ...clock });
  const end = new Date(heldTo);

  return (
    <section id="phase" aria-labelledby="phase-heading" className="scroll-mt-24">
      <h2 id="phase-heading" className="border-b border-slate-700 pb-2 text-2xl font-bold text-white">
        Where this session is
      </h2>
      <p className="mt-3 text-sm text-slate-300">
        Held {pacificAndUtc(heldFrom)} to{' '}
        {end.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' })} PT (
        {end.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC) on Zoom.
      </p>

      {cta ? (
        <div className={`mt-4 flex flex-col gap-3 rounded-xl border px-4 py-4 sm:flex-row sm:items-center ${tone.panel}`}>
          <p className="flex-1 text-lg font-semibold text-white">
            <span className={`mr-2 text-sm font-semibold uppercase tracking-wider ${tone.text}`}>Now: {phaseNowLabel(current, clock)}.</span>
            <span className="block sm:inline">{cta.text}</span>
          </p>
          <a
            href={`#${cta.anchor}`}
            className={`inline-flex shrink-0 justify-center rounded-lg px-5 py-2.5 font-semibold no-underline ${tone.button}`}
          >
            {cta.label}
          </a>
        </div>
      ) : null}

      <ol className="mt-4 space-y-2">
        {rows.map((row, i) => {
          const isCurrent = row.state === 'current';
          const done = row.state === 'done';
          const rowTone = PHASE_TONE[phaseTone(row.phase)];
          const href = `#${links[row.phase]}`;
          return (
            <li key={row.phase} aria-current={isCurrent ? 'step' : undefined}>
              <a
                href={href}
                className={`group flex gap-3 rounded-xl border px-4 py-2.5 no-underline transition hover:border-cyan-500/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
                  isCurrent ? rowTone.panel : done ? 'border-slate-700 bg-slate-900/40' : 'border-slate-800 bg-transparent'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isCurrent ? rowTone.dot : done ? 'bg-emerald-700 text-white' : 'border border-slate-600 text-slate-300'
                  }`}
                  aria-hidden
                >
                  {done ? '✓' : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block font-semibold ${isCurrent || done ? 'text-white' : 'text-slate-300'}`}>
                    {row.phase}
                    {isCurrent ? (
                      <span className={`ml-2 text-xs font-semibold uppercase tracking-wider ${rowTone.text}`}>Now</span>
                    ) : null}
                  </span>
                  {row.entry ? (
                    <span className="mt-0.5 block text-sm text-slate-300">
                      {row.entry.by} · {pacificAndUtc(row.entry.at)}
                      {row.entry.note && (isCurrent || row.entry.note.startsWith('Skipped')) ? (
                        <span className="block">{row.entry.note}</span>
                      ) : null}
                    </span>
                  ) : row.pending ? (
                    <span className="mt-0.5 block text-sm text-slate-300">
                      Scheduled: {pacificAndUtc(row.pending.at)} · {row.pending.by}
                    </span>
                  ) : (
                    <span className="mt-0.5 block text-sm text-slate-400">Not reached yet.</span>
                  )}
                </span>
                <span aria-hidden className="self-center text-cyan-300 opacity-60 transition group-hover:opacity-100">
                  ↓
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
