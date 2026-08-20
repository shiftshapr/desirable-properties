import type { Metadata } from 'next';
import Link from 'next/link';
import PadOrgLookup from '@/components/onboard/PadOrgLookup';
import { getAllianceDirectory, listAllianceOrgs } from '@/lib/hermes-onboard/directory';
import { getOnSettings } from '@/lib/hermes-onboard/settings';
import { padAbsoluteHref, padHref, padPublicBase } from '@/lib/hermes-onboard/tabs';

export const metadata: Metadata = {
  title: 'Landing pads – DP Studio',
  description:
    'Org landing pads in Desirable Properties Studio (public beta): public corpus, Desirable Properties, own layer, partner layer, and Hermes Community Chat.',
};

export default async function PadIndexPage() {
  const directory = getAllianceDirectory();
  const orgs = listAllianceOrgs();
  const settings = await getOnSettings();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-medium uppercase tracking-[0.15em] text-cyan-400">
        Desirable Properties Studio · Public beta
      </p>
      <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">{directory.cohortLabel}</h1>
      <p className="mt-4 text-lg leading-relaxed text-slate-300">
        Each member organization has a landing pad because the invitation has to be specific. We
        started from their public corpus and we are asking: did we hear your concerns correctly?
        Follow an interest until it becomes a patch idea.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">
        Version 0.77 is open for review now. Version 1.0 of <em>The Layered Web</em> and the public
        launch of DP Studio are September 16, 2026.
      </p>
      <p className="mt-3 text-sm text-slate-500">
        {directory.directoryNote} Default tab without a query string: {settings.defaultTab}.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-slate-400">
        Each org has a direct link:{' '}
        <span className="font-mono text-slate-300">{padPublicBase()}/pad/your-org-name</span> (hyphens
        optional, e.g.{' '}
        <Link href="/pad/projectliberty" className="font-mono text-cyan-400 hover:text-cyan-200">
          {padAbsoluteHref('projectliberty')}
        </Link>{' '}
        or{' '}
        <Link href="/pad/project-liberty" className="font-mono text-cyan-400 hover:text-cyan-200">
          {padAbsoluteHref('project-liberty')}
        </Link>
        ). Person pads use{' '}
        <span className="font-mono text-slate-300">{padPublicBase()}/pad/person/your-name</span>.
      </p>
      <PadOrgLookup />
      <ul className="mt-10 space-y-4">
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
    </div>
  );
}
