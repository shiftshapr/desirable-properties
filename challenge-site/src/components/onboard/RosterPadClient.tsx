'use client';

import Link from 'next/link';
import PadOrgLookup from '@/components/onboard/PadOrgLookup';
import { getDpRegistryEntry } from '@/lib/dp-registry';
import { padAbsoluteHref, padHref } from '@/lib/hermes-onboard/tabs';
import type { RosterPadEntry } from '@/lib/hermes-onboard/types';

const PLA_ALLIANCE_URL = 'https://www.projectliberty.io/alliance/';
const COHORT_SLUG = 'project-liberty-alliance';

type Props = {
  entry: RosterPadEntry;
};

export default function RosterPadClient({ entry }: Props) {
  const padUrl = padAbsoluteHref(entry.slug);
  const relatedDps = entry.relatedDps
    .map((dpId) => {
      const registry = getDpRegistryEntry(dpId);
      return registry ? { id: dpId, name: registry.name, href: registry.siteUrl } : null;
    })
    .filter((row): row is { id: string; name: string; href: string } => Boolean(row));

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-medium uppercase tracking-[0.15em] text-cyan-400">
        Project Liberty Alliance · Desirable Properties Studio · Public beta
      </p>
      <p className="mt-3 inline-flex rounded-full border border-cyan-800/60 bg-cyan-950/40 px-3 py-1 text-xs font-medium text-cyan-200">
        Alliance roster member pad
      </p>
      <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">{entry.name}</h1>
      <p className="mt-4 text-lg leading-relaxed text-slate-300">{entry.pitch.headline}</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">{entry.pitch.lead}</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-500">{entry.pitch.captureLine}</p>

      <dl className="mt-6 space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-5 text-sm">
        <div>
          <dt className="text-slate-500">Organization</dt>
          <dd className="mt-1 text-slate-200">{entry.name}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Website</dt>
          <dd className="mt-1">
            <a
              href={entry.website}
              target="_blank"
              rel="noreferrer noopener"
              className="text-cyan-400 hover:text-cyan-200"
            >
              {entry.domain}
            </a>
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Pad URL</dt>
          <dd className="mt-1 font-mono text-xs text-slate-300 sm:text-sm">{padUrl}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Membership</dt>
          <dd className="mt-1 text-slate-300">
            Listed on the public{' '}
            <a
              href={PLA_ALLIANCE_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="text-cyan-400 hover:text-cyan-200"
            >
              Project Liberty Alliance roster
            </a>
            . Full briefing content is still being built from public corpus.
          </dd>
        </div>
      </dl>

      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/30 p-5">
        <h2 className="text-lg font-semibold text-white">Working mission (hypothesis)</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{entry.mission}</p>
        <p className="mt-3 text-xs text-slate-500">
          This is a template until {entry.shortName} confirms sources and mission language.
        </p>
      </section>

      {relatedDps.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-white">Related Desirable Properties</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Inferred from org name and domain keywords. These are hypotheses until you confirm or
            correct them.
          </p>
          <ul className="mt-4 space-y-3">
            {relatedDps.map((dp) => (
              <li
                key={dp.id}
                className="rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm"
              >
                <Link
                  href={dp.href}
                  className="font-medium text-cyan-300 hover:text-cyan-200"
                >
                  {dp.id}: {dp.name}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-slate-500">
            When your full briefing is ready, these will appear on a Desirable Properties tab like
            the{' '}
            <Link href={padHref('project-liberty', 'dp')} className="text-cyan-400 hover:text-cyan-200">
              Project Liberty pad
            </Link>
            .
          </p>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-white">{entry.pitch.ask}</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Link
            href={padHref(entry.slug, 'community')}
            className="inline-flex items-center justify-center rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-500"
          >
            Claim and enrich this pad
          </Link>
          <Link
            href={padHref(COHORT_SLUG)}
            className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-500"
          >
            Back to Alliance cohort pad
          </Link>
        </div>
      </section>

      <section className="mt-10 border-t border-slate-800 pt-8">
        <h2 className="text-lg font-semibold text-white">Find another org pad</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Enter a website, Alliance member name, or pad slug.
        </p>
        <div className="mt-4">
          <PadOrgLookup />
        </div>
      </section>

      <p className="mt-8 text-xs text-slate-600">
        Sources:{' '}
        {entry.sources.map((source, index) => (
          <span key={source.url}>
            {index > 0 ? ' · ' : null}
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-slate-500 hover:text-slate-400"
            >
              {source.label}
            </a>
          </span>
        ))}
      </p>
    </div>
  );
}
