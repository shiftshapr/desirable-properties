import {
  DECLINE_CATEGORIES,
  DECLINE_CONTRIBUTING,
  DECLINE_DATA_NOTES,
  DECLINE_PATTERNS,
  DECLINES_AS_OF,
  DECLINES_ROUND,
  DECLINES_TOTALS as T,
} from '@/data/sessions/2026-11-16-declines';
import SessionCollapsible from './SessionCollapsible';
import SessionLabel from './SessionLabel';

const linkClass = 'text-cyan-300 hover:text-cyan-200';

/**
 * Why proposals were declined or deferred in Version 1.0: a taxonomy of the reasons, for people writing proposals
 * for Version 1.1. Requested in the session (Benn Konsynski, 00:23:44). Aggregate counts only. Not time-gated.
 */
export default function DeclineReasons({ correctionsEmail }: { correctionsEmail: string }) {
  const max = Math.max(...DECLINE_CATEGORIES.map((c) => c.primary));
  const flagHref = `mailto:${correctionsEmail}?subject=${encodeURIComponent(
    'Version 1.0 declines and deferrals: miscategorised proposal',
  )}&body=${encodeURIComponent(
    'Which proposal (link or chapter and a few words of it):\n\nCategory shown:\n\nWhat it should be, and why:\n',
  )}`;

  return (
    <SessionCollapsible
      id="declines"
      title="Why proposals were declined or deferred in Version 1.0"
      badge={<SessionLabel kind="Claude synthesis" />}
    >
      <div className="space-y-4 text-base leading-relaxed text-slate-300">
        <p>
          Benn Konsynski asked for this in the session (
          <a href="#t-1396" className={linkClass}>
            00:23:44
          </a>
          ): the common reasons proposals did not go in, so that people writing proposals for Version 1.1 know what
          to avoid.
        </p>
        <p>
          In the Version 1.0 round ({DECLINES_ROUND}), {T.total} proposals were declined ({T.declined}) or deferred
          to Version 1.1 ({T.deferred}). {T.fromPeople} came from people and {T.fromStewards} from steward accounts.
          For scale: of the {T.people.filed} proposals people filed, {T.people.published} were published (
          {T.people.publishedAfterRevision} after a co-editor revised them), {T.people.declined} were declined and{' '}
          {T.people.deferred} deferred.
        </p>
      </div>

      <h3 className="mt-8 text-lg font-semibold text-white">Reasons, by how often they were the main one</h3>
      <p className="mt-1 text-sm text-slate-400">
        Count and share of the {T.total} by main reason. The bar shows declined{' '}
        <span className="inline-block h-2.5 w-2.5 rounded-sm bg-rose-400/80 align-middle" aria-hidden="true" /> and
        deferred <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-300/80 align-middle" aria-hidden="true" />.
        “Applies to” counts every proposal the reason fits, so those numbers overlap.
      </p>
      <ol className="mt-4 space-y-3">
        {DECLINE_CATEGORIES.map((c) => (
          <li key={c.key} className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h4 className="text-base font-semibold text-white">{c.label}</h4>
              <p className="text-sm tabular-nums text-slate-300">
                <strong className="text-white">{c.primary}</strong> ({c.share}%) · {c.declined} declined,{' '}
                {c.deferred} deferred · applies to {c.any}
              </p>
            </div>
            <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-800" aria-hidden="true">
              <div className="flex h-full" style={{ width: `${(c.primary / max) * 100}%` }}>
                <div className="h-full bg-rose-400/80" style={{ width: `${(c.declined / c.primary) * 100}%` }} />
                <div className="h-full bg-amber-300/80" style={{ width: `${(c.deferred / c.primary) * 100}%` }} />
              </div>
            </div>
            <p className="mt-2 text-sm text-slate-300">{c.definition}</p>
            <p className="mt-1 text-sm text-slate-400">For example: {c.examples.join(' ')}</p>
            <p className="mt-1 text-sm text-emerald-200/90">
              <span className="font-medium">What would have helped:</span> {c.helps}
            </p>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-sm text-slate-400">
        Also seen, but never the main reason:{' '}
        {DECLINE_CONTRIBUTING.map((f) => `${f.label.toLowerCase()} (${f.any})`).join('; ')}.
      </p>

      <h3 className="mt-8 text-lg font-semibold text-white">Patterns worth acting on for Version 1.1</h3>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-relaxed text-slate-300">
        {DECLINE_PATTERNS.map((p) => (
          <li key={p.slice(0, 40)}>{p}</li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-slate-400">
        These describe what happened. Rules such as thresholds, councils and who decides are for the community.
      </p>

      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm leading-relaxed text-slate-400">
        <h3 className="text-base font-semibold text-white">How this was made</h3>
        <p className="mt-2">
          Claude categorised the co-editors’ decision notes, building the categories from the notes themselves.
          Each proposal has one main reason, and categories can overlap. Counts are as of {DECLINES_AS_OF}, from
          Gov Hub. No names, quotes or individual proposals are shown here.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {DECLINE_DATA_NOTES.map((n) => (
            <li key={n.slice(0, 40)}>{n}</li>
          ))}
        </ul>
        <p className="mt-2">
          Think one of your proposals is in the wrong category?{' '}
          <a href={flagHref} className={linkClass}>
            Email {correctionsEmail}
          </a>{' '}
          with the proposal and the category you would expect.
        </p>
      </div>
    </SessionCollapsible>
  );
}
