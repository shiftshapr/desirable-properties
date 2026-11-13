'use client';

import Link from 'next/link';
import type { SteeringFinalRound, SteeringFinalStatus, SteeringOverviewRow } from '@/lib/dp-steering';

/** Gov Hub's public page for a document's current text (a fixed host: env vars differ server and client). */
const CHAPTER_BASE = 'https://interfacehub.net';

const STATUS_ORDER: SteeringFinalStatus[] = ['open', 'needs_recheck', 'not_read', 'clean', 'signed'];
const STATUS: Record<SteeringFinalStatus, { label: string; tone: string }> = {
  open: { label: 'Findings to settle', tone: 'border-amber-700/70 text-amber-200' },
  needs_recheck: { label: 'Needs a re-check', tone: 'border-cyan-700/70 text-cyan-200' },
  not_read: { label: 'Not read yet', tone: 'border-slate-700 text-slate-300' },
  clean: { label: 'Ready to sign', tone: 'border-violet-700/70 text-violet-200' },
  signed: { label: 'Signed off', tone: 'border-emerald-700/70 text-emerald-200' },
};

/** The document's finished text, as it stands now (what a sign-off is tied to). */
const chapterUrl = (ml: string) => `${CHAPTER_BASE}/doc/draft/${ml}/`;

/**
 * Stage 4 (Final read): the rounds so far and where each document stands. A document with nothing found
 * is ready to sign; one whose findings were fixed needs a re-check; two sign-offs on its current text
 * finish it. Findings themselves are in the bundles above.
 */
export default function FinalReadPanel({
  rows,
  rounds,
  steering,
}: {
  rows: SteeringOverviewRow[];
  rounds: SteeringFinalRound[] | null;
  steering: boolean;
}) {
  const listed = rows.filter((r) => r.listed);
  const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, listed.filter((r) => r.final?.status === s).length])) as Record<
    SteeringFinalStatus,
    number
  >;
  const sorted = [...listed].sort(
    (a, b) =>
      STATUS_ORDER.indexOf(a.final?.status || 'not_read') - STATUS_ORDER.indexOf(b.final?.status || 'not_read') ||
      Number(a.frontMatter === false) - Number(b.frontMatter === false),
  );
  const recheck = listed.filter((r) => r.final?.status === 'needs_recheck');

  return (
    <section aria-label="Final read" className="space-y-4 rounded-2xl border border-violet-800/60 bg-violet-950/10 p-4 sm:p-5">
      <div>
        <h2 className="text-xl font-semibold text-white">Final read: document by document</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-300">
          Round 1 reads every document’s finished text. A document it finds clean goes straight to sign-off. Where it
          finds something, the fixes and choices are settled in the bundles above (two members each). The changed
          document is then re-checked, round after round, until a check finds nothing. Two steering members then sign
          off the text as it stands.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3" aria-label="Documents by status">
        {STATUS_ORDER.map((s) => (
          <div key={s} className="rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-2 sm:min-w-36">
            <dt className="text-xs uppercase tracking-wide text-slate-500">{STATUS[s].label}</dt>
            <dd className="text-2xl font-semibold text-white">{counts[s]}</dd>
          </div>
        ))}
      </dl>

      {rounds?.length ? (
        <ol className="space-y-1 text-sm text-slate-300" aria-label="Rounds">
          {rounds.map((r) => (
            <li key={r.round}>
              <span className="font-semibold text-white">Round {r.round}</span>
              {r.round === 1 ? ' (final read)' : ' (re-check)'}: read {r.documentsRead} document{r.documentsRead === 1 ? '' : 's'},{' '}
              {r.documentsClean} clean, {r.findings} finding{r.findings === 1 ? '' : 's'}
              {r.importedAt ? <span className="text-slate-500"> · {new Date(r.importedAt).toLocaleString()}</span> : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-slate-400">The final read has not been run yet.</p>
      )}
      {recheck.length ? (
        <p className="rounded-lg border border-cyan-800/60 bg-cyan-950/20 px-3 py-2 text-sm text-cyan-100">
          Next round re-checks {recheck.length} changed document{recheck.length === 1 ? '' : 's'}:{' '}
          {recheck.map((r) => r.title.split(' - ')[0]).join(', ')}.
        </p>
      ) : null}

      <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800">
        {sorted.map((r) => {
          const f = r.final;
          const st = STATUS[f?.status || 'not_read'];
          return (
            <li key={r.mlNumber} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-sm">
              <span className={`rounded border px-1.5 py-0.5 text-xs ${st.tone}`}>{st.label}</span>
              <span className="min-w-0 flex-1 truncate text-slate-100" title={r.title}>
                {r.title}
              </span>
              <span className="text-xs text-slate-400">
                {f?.status === 'open'
                  ? [f.openFixes ? `${f.openFixes} fix${f.openFixes === 1 ? '' : 'es'}` : '', f.openDecisions ? `${f.openDecisions} decision${f.openDecisions === 1 ? '' : 's'}` : '']
                      .filter(Boolean)
                      .join(' · ')
                  : f?.check
                    ? `checked in round ${f.check.round}`
                    : ''}
                {r.signoff && f?.status !== 'signed' && r.signoff.count ? ` · ${r.signoff.count} of 2 sign-offs` : ''}
              </span>
              <a href={chapterUrl(r.mlNumber)} target="_blank" rel="noreferrer" className="text-xs text-cyan-300 underline hover:text-cyan-200">
                Full text
              </a>
              {steering ? (
                <Link href={`/steering/${r.mlNumber}`} className="text-xs text-cyan-300 underline hover:text-cyan-200">
                  {f?.canSign && f.status !== 'signed' ? 'Sign off' : 'Open'}
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
