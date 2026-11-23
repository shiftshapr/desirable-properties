'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { outcomeText, type BallotResults } from '@/lib/ballots/ballot-core';

/**
 * A short read-out of a published session ballot, for the next session's page, so last week's results open this
 * week's meeting. Reads the same public endpoint as the ballot panel; shows nothing until results are published.
 */
export default function BallotResultsSummary({ slug, pageHref, heading }: { slug: string; pageHref: string; heading: string }) {
  const [results, setResults] = useState<BallotResults | null>(null);
  useEffect(() => {
    let live = true;
    fetch(`/api/ballots/${encodeURIComponent(slug)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (live && j?.ballot?.status === 'published' && j.results) setResults(j.results as BallotResults); })
      .catch(() => {});
    return () => { live = false; };
  }, [slug]);
  if (!results) return null;
  const link = 'text-cyan-300 underline hover:text-cyan-200';
  return (
    <section id="ballot-results" className="mt-8 scroll-mt-24">
      <h2 className="border-b border-slate-700 pb-2 text-2xl font-semibold text-white">{heading}</h2>
      <p className="mt-3">
        {results.voters} people voted. Full counts for every option are on the{' '}
        <Link href={`${pageHref}#vote`} className={link}>session page</Link>.
      </p>
      <ol className="mt-3 space-y-2">
        {results.questions.map((q) => (
          <li key={q.key} className="text-base">
            <span className="text-slate-400">{q.n}. </span>
            <span className="text-slate-100">{q.question}</span>
            <span className={`ml-2 rounded border px-1.5 text-xs ${q.outcome.result === 'tie' ? 'border-amber-600/80 text-amber-200' : 'border-emerald-600/80 text-emerald-200'}`}>
              {outcomeText(q)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
