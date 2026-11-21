import type { Metadata } from 'next';
import Link from 'next/link';
import { VERSION_MARKER_LABEL } from '@/lib/dp-v11';
import { loadOpenItems, type OpenItemsDoc } from '@/lib/dp-v11-open-items.server';
import { padHref, shortId } from '@/lib/pads/proposal-pad-core';
import { storedTitles } from '@/lib/pads/proposal-pad.server';
import { pageOpenGraph } from '@/lib/site-metadata';

export const revalidate = 120;

export const metadata: Metadata = {
  title: 'Pads | Desirable Properties',
  description: 'One page for each open proposal on The Layered Web: what it changes, in plain terms, the record behind it, and where to weigh in.',
  openGraph: pageOpenGraph({
    title: 'Pads',
    description: 'One page for each open proposal: what it changes, the record, and where to weigh in.',
    path: '/pads',
  }),
};

function snippet(text: string, max = 110): string {
  const flat = String(text || '').replace(/[#*_`>]/g, '').replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function ProposalPadsSection({ docs, storedTitle }: { docs: OpenItemsDoc[]; storedTitle: (id: string) => string | null }) {
  const withItems = docs.filter((d) => d.items.length);
  const total = withItems.reduce((n, d) => n + d.items.length, 0);
  const missing = docs.filter((d) => !d.loaded);
  return (
    <section id="proposals" aria-labelledby="proposals-heading" className="scroll-mt-24">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-800 pb-2">
        <h2 id="proposals-heading" className="text-2xl font-bold text-white">
          Proposal pads
          <span className="ml-2 text-base font-normal text-slate-400">{total}</span>
        </h2>
        <Link href="/improve/open-items" className="text-sm text-cyan-300 hover:text-cyan-200">
          Open items list →
        </Link>
      </div>
      <p className="mt-3 max-w-3xl text-sm text-slate-400">
        Every open proposal for Version 1.1, by Desirable Property. Each pad explains the change in plain terms, shows it in
        the chapter, and keeps the record. The DP&apos;s co-editors decide; anyone signed in can say whether they support it.
      </p>
      {missing.length ? (
        <p className="mt-2 text-sm text-amber-200">Gov Hub did not answer for {missing.map((d) => d.key).join(', ')}; reload to try again.</p>
      ) : null}
      <div className="mt-6 space-y-6">
        {withItems.map((doc) => (
          <div key={doc.mlNumber}>
            <h3 className="text-base font-semibold text-white">
              {doc.label}
              <span className="ml-2 text-sm font-normal text-slate-500">{doc.items.length}</span>
            </h3>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {doc.items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={padHref(item.id)}
                    className="block h-full rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2.5 hover:border-cyan-700"
                  >
                    <span className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="font-mono text-slate-500">{shortId(item.id)}</span>
                      {item.marker ? (
                        <span className="rounded border border-sky-700/70 px-1.5 text-sky-200">{VERSION_MARKER_LABEL[item.marker]}</span>
                      ) : null}
                      {item.applicability !== 'applies' ? (
                        <span className="rounded border border-rose-800/70 px-1.5 text-rose-200">Needs re-anchoring</span>
                      ) : null}
                      {item.approvals ? <span className="text-slate-400">{item.approvals} approval{item.approvals === 1 ? '' : 's'}</span> : null}
                    </span>
                    <span className="mt-1 block text-sm text-slate-100">
                      {storedTitle(item.id) || snippet(item.proposedText || item.rationale) || 'Proposal'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {!withItems.length ? <p className="text-slate-300">No open proposals right now.</p> : null}
      </div>
    </section>
  );
}

/**
 * /pads: one section per pad type. Proposal pads come first; other pad types (meeting pads) add their own section
 * component to this page in the same shape (an id for the #anchor, a heading, a list of links to their pads).
 */
export default async function PadsIndexPage() {
  const [docs, storedTitle] = await Promise.all([loadOpenItems(), storedTitles()]);
  return (
    <main className="mx-auto w-full min-w-0 max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="pb-8">
        <p className="text-sm font-medium uppercase tracking-[0.15em] text-sky-300">Version 1.1</p>
        <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Pads</h1>
        <p className="mt-4 max-w-3xl text-base text-slate-300">
          A pad is one page for one thing being decided: all the information in one place, explained in plain terms, with
          the way to have your say.
        </p>
        <nav aria-label="Pad types" className="mt-4 flex flex-wrap gap-2 text-sm">
          <a href="#proposals" className="rounded-full border border-slate-700 px-3 py-1 text-slate-200 hover:border-cyan-500">
            Proposals
          </a>
        </nav>
      </header>
      <div className="space-y-12">
        <ProposalPadsSection docs={docs} storedTitle={storedTitle} />
      </div>
    </main>
  );
}
