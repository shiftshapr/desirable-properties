'use client';

import Link from 'next/link';
import PadHero from '@/components/onboard/PadHero';
import { buildPersonPadHref } from '@/lib/hermes-onboard/person-pad-lookup';
import { padPublicBase } from '@/lib/hermes-onboard/tabs';

type PersonPadRequestClientProps = {
  slug: string;
  displayName: string;
};

export default function PersonPadRequestClient({ slug, displayName }: PersonPadRequestClientProps) {
  const padUrl = `${padPublicBase()}${buildPersonPadHref(slug)}`;

  return (
    <>
      <PadHero />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-sm font-medium uppercase tracking-[0.15em] text-cyan-400">
          Desirable Properties Studio · Public beta
        </p>
        <p className="mt-3 inline-flex rounded-full border border-amber-700/60 bg-amber-950/40 px-3 py-1 text-xs font-medium text-amber-200">
          Person pad not published yet
        </p>
        <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">{displayName}</h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-300">
          We do not have a person landing pad at this URL yet.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Person pads are created from your public profile links, work, and the sources you choose.
          Start from the pad finder, pick the Person tab, and we will build your pad from what you
          share. We never scrape LinkedIn.
        </p>
        <dl className="mt-6 space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-5 text-sm">
          <div>
            <dt className="text-slate-500">Pad slug</dt>
            <dd className="mt-1 font-mono text-slate-200">{slug}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Reserved URL</dt>
            <dd className="mt-1 font-mono text-xs text-slate-300 sm:text-sm">{padUrl}</dd>
          </div>
        </dl>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/pad?mode=person"
            className="inline-flex items-center justify-center rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-500"
          >
            Create this person pad
          </Link>
          <Link
            href="/pad"
            className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-500"
          >
            Back to pad lookup
          </Link>
        </div>
      </div>
    </>
  );
}
