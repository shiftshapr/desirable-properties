import Link from 'next/link';
import CohortRosterList from '@/components/onboard/CohortRosterList';
import PadHero from '@/components/onboard/PadHero';
import PadOrgLookup from '@/components/onboard/PadOrgLookup';
import { getAllianceDirectory, listCorpusOrgs, listStewardOrgs } from '@/lib/hermes-onboard/directory';
import { listRosterPadEntries } from '@/lib/hermes-onboard/roster-pads';
import { listRosterOrgs } from '@/lib/hermes-onboard/roster';
import { padAbsoluteHref, padHref } from '@/lib/hermes-onboard/tabs';

const PLA_ALLIANCE_URL = 'https://www.projectliberty.io/alliance/';

export default async function CohortPadClient() {
  const directory = getAllianceDirectory();
  const stewards = listStewardOrgs();
  const corpusOrgs = listCorpusOrgs();
  const rosterCount = listRosterOrgs().length;
  const rosterPads = listRosterPadEntries();

  return (
    <>
      <PadHero />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-medium uppercase tracking-[0.15em] text-cyan-400">
        {directory.cohortLabel} · Desirable Properties Studio · Public beta
      </p>
      <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
        Welcome, {directory.cohortLabel}
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-slate-300">
        The Project Liberty Alliance brings together more than 200 organizations, tech companies,
        policy groups, impact initiatives, academic institutions, and more, committed to a
        people-centered internet.
      </p>
      <p className="mt-3 text-base leading-relaxed text-slate-400">
        The Alliance serves as a learning and collaboration engine: members advance their own goals
        while strengthening work toward shared objectives. This landing pad is your entry point in
        Desirable Properties Studio. Each organization gets a pad built from public corpus. Pads are
        for dialogue: they learn from your choices (with consent), suggest how your perspective
        might be read, and let you refine how your work is captured. Suppositions stay hypotheses
        until you confirm.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">
        Version 0.77 is open for review now. Version 1.0 of <em>The Layered Web</em> and the public
        launch of DP Studio are September 16, 2026.
      </p>

      <PadOrgLookup />

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-white">Full briefing pads ready now</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          {stewards.length} Project Liberty steward orgs have hand-curated landing pads.
          {corpusOrgs.length > 0
            ? ` ${corpusOrgs.length} additional Alliance members have full pads built from quotable public work (research, reports, perspectives, blogs).`
            : ' Additional roster members receive full pads when we can cite their public work.'}
        </p>
        {stewards.length > 0 && (
          <>
            <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Steward orgs
            </h3>
            <ul className="mt-3 space-y-4">
              {stewards.map((org) => (
                <li key={org.slug} className="rounded-xl border border-slate-800 bg-slate-900/30 p-5">
                  <Link
                    href={padHref(org.slug)}
                    className="text-lg font-semibold text-cyan-300 hover:text-cyan-200"
                  >
                    {org.name}
                  </Link>
                  <p className="mt-1 font-mono text-xs text-slate-500">{padAbsoluteHref(org.slug)}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {org.pitch?.headline || org.mission}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
        {corpusOrgs.length > 0 && (
          <>
            <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Public-work corpus ({corpusOrgs.length})
            </h3>
            <ul className="mt-3 space-y-3">
              {corpusOrgs.map((org) => (
                <li key={org.slug} className="rounded-lg border border-slate-800/80 bg-slate-900/20 px-4 py-3">
                  <Link href={padHref(org.slug)} className="font-medium text-cyan-300 hover:text-cyan-200">
                    {org.name}
                  </Link>
                  <p className="mt-1 text-xs text-slate-500">{org.sources.length} cited source(s) · hypothesis</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="mt-10 rounded-xl border border-slate-800 bg-slate-900/30 p-5">
        <h2 className="text-lg font-semibold text-white">All Alliance member pads</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          We imported {rosterCount} member names and domains from the public{' '}
          <a
            href={PLA_ALLIANCE_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="text-cyan-400 hover:text-cyan-200"
          >
            Project Liberty Alliance page
          </a>
          . Every roster member has a working landing pad at{' '}
          <span className="font-mono text-slate-300">/pad/&#123;slug&#125;</span>. Steward orgs and
          members with citable public work have full corpus briefings; the rest use invitation pads
          you can claim and enrich.
        </p>
        <div className="mt-6">
          <CohortRosterList entries={rosterPads} />
        </div>
      </section>

      <p className="mt-8 text-sm leading-relaxed text-slate-500">
        Not an Alliance member? See the generic{' '}
        <Link href="/pad" className="text-cyan-400 hover:text-cyan-200">
          DP Studio landing pad index
        </Link>
        .
      </p>

      <p className="mt-4 text-xs text-slate-600">
        Source:{' '}
        <a
          href={PLA_ALLIANCE_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="text-slate-500 hover:text-slate-400"
        >
          projectliberty.io/alliance
        </a>
      </p>
      </div>
    </>
  );
}
