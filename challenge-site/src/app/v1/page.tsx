import type { Metadata } from 'next';
import Link from 'next/link';
import LayeredWebVideoCarousel from '@/components/LayeredWebVideoCarousel';
import AskDeepiPanel from '@/components/v1/AskDeepiPanel';
import V1ReportHero from '@/components/v1/V1ReportHero';
import { layeredWebVideosAt } from '@/data/layered-web-videos';

export const revalidate = 0;

export const metadata: Metadata = {
  title: 'The Layered Web, Version 1.0 | Desirable Properties',
  description:
    'The Layered Web: The Desirable Properties of a Meta-Layer, Version 1.0. Twenty-four properties for a trustworthy layer above the web, written in the open. Download the report, read it online, or share it.',
  openGraph: {
    title: 'The Layered Web, Version 1.0',
    description: 'Twenty-four Desirable Properties for a trustworthy layer above the web, written in the open.',
    images: [{ url: '/images/v1/book-3d-1200.jpg', width: 1200, height: 1200, alt: 'The Layered Web, Version 1.0' }],
  },
};

const STATS: Array<[string, string]> = [
  ['24', 'Desirable Properties, one chapter each'],
  ['1,635', 'proposals decided in the open'],
  ['2', 'Calls for Input, 2024 and 2025'],
  ['28', 'documents, each signed off by two steering members'],
];

const STEPS: Array<[string, string]> = [
  ['Desirable Properties', 'What a trustworthy layer above the web must do. This book.'],
  ['Requirements', 'Each property becomes testable requirements (ML-REQs).'],
  ['Architecture decisions', 'Requirements become recorded design decisions (ML-ADRs), tied to code and tests.'],
  ['The Overweb', 'Built and piloted against those decisions; the evidence flows back into the next version.'],
];

export default function V1Page() {
  const now = new Date();
  return (
    <main>
      <V1ReportHero />

      <section aria-label="Version 1.0 in numbers" className="border-b border-slate-800 bg-slate-950">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 lg:grid-cols-4">
          {STATS.map(([n, label]) => (
            <div key={label}>
              <dt className="sr-only">{label}</dt>
              <dd className="text-3xl font-bold text-amber-300 sm:text-4xl">{n}</dd>
              <dd className="mt-1 text-sm text-slate-400">{label}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="v1-fits-heading" className="border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Where it fits</p>
          <h2 id="v1-fits-heading" className="mt-2 text-3xl font-bold text-white">From principles to a working layer</h2>
          <p className="mt-3 max-w-3xl text-slate-300">
            The Desirable Properties are the first step of a circuit that turns shared values into running software,
            and running software back into better values.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/v1/roadmap.webp"
            width={1400}
            height={626}
            alt="We are here to define the next level of the internet: Desirable Properties Challenge, then Requirements, then Architecture Decision Records, then Build Overweb"
            className="mt-8 w-full max-w-4xl"
            loading="lazy"
          />
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                <p className="text-xs font-semibold text-slate-500">Step {i + 1}</p>
                <p className="mt-1 font-semibold text-white">{title}</p>
                <p className="mt-1 text-sm text-slate-400">{body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm text-slate-400">
            Follow the circuit on{' '}
            <a href="https://theoverweb.org/reqs/" className="text-cyan-300 hover:text-cyan-200">
              requirements
            </a>{' '}
            and{' '}
            <a href="https://theoverweb.org/adrs/" className="text-cyan-300 hover:text-cyan-200">
              architecture decisions
            </a>{' '}
            at theoverweb.org.
          </p>
        </div>
      </section>

      <section aria-labelledby="v1-living-heading" className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">A living book</p>
          <h2 id="v1-living-heading" className="mt-2 text-3xl font-bold text-white">Version 1.0 is a starting point</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <a href="https://book.desirableproperties.org/" className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 hover:border-cyan-600">
              <p className="font-semibold text-white">Read and discuss →</p>
              <p className="mt-2 text-sm text-slate-400">
                Every page of the online book has a discussion layer. Ask, challenge and annotate in place.
              </p>
            </a>
            <Link href="/steering" className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 hover:border-cyan-600">
              <p className="font-semibold text-white">See how it was decided →</p>
              <p className="mt-2 text-sm text-slate-400">
                Every proposal, who decided it and why, and the final text of all 28 documents. Proposals for
                Version 1.1 open next.
              </p>
            </Link>
            <Link href="/onchain" className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 hover:border-cyan-600">
              <p className="font-semibold text-white">Preserved on Bitcoin →</p>
              <p className="mt-2 text-sm text-slate-400">
                Chapters, the Calls for Input and their history are inscribed on Bitcoin through BRC333, so the
                record outlives any website.
              </p>
            </Link>
          </div>
        </div>
      </section>

      <AskDeepiPanel />

      <section className="border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="text-2xl font-bold text-white">The Layered Web, in short videos</h2>
          <p className="mt-2 max-w-2xl text-slate-400">
            Why the web needs a layer above the page, and what the 24 properties are for.
          </p>
          <div className="mt-6">
            <LayeredWebVideoCarousel videos={layeredWebVideosAt(now)} />
          </div>
        </div>
      </section>
    </main>
  );
}
