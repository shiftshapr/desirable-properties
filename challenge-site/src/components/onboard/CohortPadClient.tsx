import Link from 'next/link';
import PadOrgLookup from '@/components/onboard/PadOrgLookup';
import { getAllianceDirectory, listAllianceOrgs } from '@/lib/hermes-onboard/directory';
import { listRosterOrgs } from '@/lib/hermes-onboard/roster';
import { padAbsoluteHref, padHref } from '@/lib/hermes-onboard/tabs';

const PLA_ALLIANCE_URL = 'https://www.projectliberty.io/alliance/';

export default async function CohortPadClient() {
  const directory = getAllianceDirectory();
  const orgs = listAllianceOrgs();
  const rosterCount = listRosterOrgs().length;

  return (
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
          Three Project Liberty family orgs have full landing pads with briefings, Desirable
          Properties, and community chat. Start here if you represent one of them.
        </p>
        <ul className="mt-4 space-y-4">
          {orgs.map((org) => (
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
              <p className="mt-3 text-xs text-slate-500">
                <Link href={padHref(org.slug, 'dp')} className="text-cyan-400 hover:text-cyan-200">
                  Desirable Properties
                </Link>
                {' · '}
                <Link href={padHref(org.slug, 'brief')} className="text-cyan-400 hover:text-cyan-200">
                  Brief
                </Link>
                {' · '}
                <Link
                  href={padHref(org.slug, 'community')}
                  className="text-cyan-400 hover:text-cyan-200"
                >
                  Community Chat
                </Link>
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 rounded-xl border border-slate-800 bg-slate-900/30 p-5">
        <h2 className="text-lg font-semibold text-white">Alliance roster lookup</h2>
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
          . Roster matches open a reserved stub pad while we build a full briefing from your public
          corpus. Only the three orgs above have full pitches and briefing content so far.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          Use the lookup form above with your org website or name (for example{' '}
          <span className="font-mono text-slate-400">consumerreports.org</span>) to find your pad.
        </p>
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
  );
}
