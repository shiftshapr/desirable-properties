import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';

export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Press release: Version 1.0 | Desirable Properties',
  description:
    'The Layered Web: The Desirable Properties of a Meta-Layer, Version 1.0, released 13 November 2026 after an open, community-written review.',
};

/** Goes live right after the launch event (10 to 11am PT, 13 November 2026). */
const RELEASE_AT = Date.parse('2026-11-13T19:00:00Z');

/**
 * Quotes show on production only once their speaker has approved the wording. On staging, unapproved
 * drafts show with a "draft" label so they can be reviewed.
 */
const QUOTES: Array<{ who: string; role: string; text: string; approved: boolean }> = [
  {
    who: 'Daveed Benjamin',
    role: 'Founder, Meta-Layer Initiative; steering committee',
    text:
      'This book was written the way we want the next layer of the internet to work: in the open, with every proposal recorded, every decision explained, and every contributor named. Version 1.0 gives builders a shared reference for what a trustworthy Meta-Layer has to get right. Version 1.1 opens today, and anyone can propose the next change.',
    approved: true, // approved by Daveed Benjamin, 13 Nov 2026
  },
  {
    who: 'Phahsa Ras',
    role: 'Steering committee; co-editor of DP4, DP6, DP17 and DP22',
    text:
      'We read every proposal, and then we read the whole book again, chapter by chapter, until nothing was left to fix. What we signed off is a text that hundreds of people helped shape.',
    approved: false,
  },
  {
    who: 'A co-editor (to be named)',
    role: 'Co-editor',
    text: 'Quote to be supplied and approved by the co-editor.',
    approved: false,
  },
];

const FACTS = [
  ['Released', '13 November 2026, at the Version 1.0 launch event'],
  ['Scope', '24 Desirable Properties, plus an Introduction, About, Acknowledgements and Cover'],
  ['Proposals reviewed', '1,787, including 507 from the community'],
  ['Contributors named', '69, from two public Calls for Input (2024 and 2025) and the Desirable Properties Challenge'],
  ['Review', 'Four steering stages: proposal review, cross-chapter check, style pass, and a final read repeated until it found nothing'],
  ['Licence', 'CC BY 4.0'],
  ['Preservation', 'Most chapters are inscribed on Bitcoin'],
];

export default async function PressPage() {
  const host = (await headers()).get('host') || '';
  const staging = host.startsWith('staging.') || host.startsWith('localhost') || host.startsWith('127.');
  const now = new Date();
  const before = now.getTime() < RELEASE_AT;
  const live = !before || staging;
  const quotes = QUOTES.filter((q) => q.approved || staging);

  if (!live) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-bold text-white">Press release</h1>
        <p className="mt-4 text-slate-300">
          The Version 1.0 press release is published here after the launch event, at 11:00 PT on 13 November 2026.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {staging && before ? (
        <p className="mb-6 rounded-lg border border-amber-700/70 bg-amber-950/20 px-3 py-2 text-sm text-amber-100">
          Staging preview. On desirableproperties.org this page appears at 11:00 PT on 13 November 2026, and only approved
          quotes are shown.
        </p>
      ) : null}
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-300">Press release · For immediate release</p>
      <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl" style={{ textWrap: 'balance' }}>
        Community-written book defines what a trustworthy layer above the web must do
      </h1>
      <p className="mt-3 text-lg text-slate-300">
        <em>The Layered Web: The Desirable Properties of a Meta-Layer</em>, Version 1.0, is released after an open review
        in which every proposal, decision and contributor is on the record.
      </p>

      <div className="mt-8 space-y-5 leading-7 text-slate-200">
        <p>
          <strong>13 November 2026.</strong> The Meta-Layer Initiative today released Version 1.0 of{' '}
          <em>The Layered Web: The Desirable Properties of a Meta-Layer</em>, an open book that sets out 24 properties a
          shared coordination layer above websites and applications needs in order to support trust, context, presence and
          governance on the internet.
        </p>
        <p>
          The work began at the Meta-Layer Initiative kickoff on 16 September 2024 with a simple question: what should a
          Meta-Layer be like? Two public Calls for Input followed, in 2024 and 2025, and then the Desirable Properties
          Challenge, in which anyone could propose changes to any chapter on the project&apos;s Gov Hub. Co-editors
          reviewed the chapters, and since the 9 November freeze a steering committee has decided every open item in four
          stages: a review of each proposal, a check of every change against the whole book, a style pass, and a final read
          of every chapter, repeated until a reading found nothing left to fix. Each document was then signed off on its
          exact text.
        </p>
        <p>
          The 24 properties range from federated authentication and accountability, data sovereignty and decentralized
          namespaces to safe and ethical AI, community governance of AI, trust and transparency, community ownership, and
          cross-layer resilience. Each chapter states what the property protects, the threats it answers, the mechanisms that
          deliver it, and the minimum a system must do to claim alignment.
        </p>
        <p>
          The text is published under CC BY 4.0, and most chapters are inscribed on Bitcoin as enduring digital artifacts.
          Version 1.1 is now open for proposals, with chapter glossaries and steering-decided purpose statements planned;
          Version 1.2 will add reviewed images.
        </p>
      </div>

      {quotes.length ? (
        <section className="mt-10 space-y-5" aria-label="Quotes">
          {quotes.map((q) => (
            <figure key={q.who} className="border-l-2 border-violet-600 pl-4">
              {!q.approved ? (
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-300">Draft quote, awaiting approval</p>
              ) : null}
              <blockquote className="text-slate-100">&ldquo;{q.text}&rdquo;</blockquote>
              <figcaption className="mt-2 text-sm text-slate-400">
                {q.who}, {q.role}
              </figcaption>
            </figure>
          ))}
        </section>
      ) : null}

      <section className="mt-10" aria-label="Fast facts">
        <h2 className="text-lg font-semibold text-white">Fast facts</h2>
        <dl className="mt-3 divide-y divide-slate-800 rounded-xl border border-slate-800">
          {FACTS.map(([k, v]) => (
            <div key={k} className="grid gap-1 px-4 py-2 text-sm sm:grid-cols-[12rem_1fr]">
              <dt className="text-slate-400">{k}</dt>
              <dd className="text-slate-200">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-10 space-y-2 text-sm text-slate-300" aria-label="Read the book">
        <h2 className="text-lg font-semibold text-white">Read and take part</h2>
        <p>
          Read Version 1.0 online at{' '}
          <a href="https://book.desirableproperties.org" className="text-cyan-300 underline hover:text-cyan-200">
            book.desirableproperties.org
          </a>{' '}
          or download the PDF from the{' '}
          <Link href="/v1" className="text-cyan-300 underline hover:text-cyan-200">
            Version 1.0 page
          </Link>
          . The full record of the review, stage by stage, is on the{' '}
          <Link href="/steering?stage=ledger" className="text-cyan-300 underline hover:text-cyan-200">
            steering Ledger
          </Link>
          .
        </p>
      </section>

      <section className="mt-10 space-y-2 border-t border-slate-800 pt-6 text-sm text-slate-400" aria-label="About and contact">
        <p>
          <strong className="text-slate-200">About the Meta-Layer Initiative.</strong> The Meta-Layer Initiative is a Bridgit
          DAO project working toward a shared coordination layer above the web, built in the open with its community.
        </p>
        <p>
          <strong className="text-slate-200">Press contact:</strong> Daveed Benjamin, daveed@bridgit.io
        </p>
      </section>
    </main>
  );
}
