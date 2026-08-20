import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllianceDirectory, listAllianceOrgs } from '@/lib/hermes-onboard/directory';

export const metadata: Metadata = {
  title: 'Hermes Onboarding – Project Liberty Alliance',
  description:
    'Dynamic Overweb briefings for Project Liberty Alliance member organizations: own layer, partner layer, and Hermes Community Chat.',
};

export default function OnboardIndexPage() {
  const directory = getAllianceDirectory();
  const orgs = listAllianceOrgs();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-medium uppercase tracking-[0.15em] text-cyan-400">
        Hermes Onboarding
      </p>
      <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">{directory.cohortLabel}</h1>
      <p className="mt-4 text-lg leading-relaxed text-slate-300">
        Each member organization gets a living briefing: the top three ways it could extend
        capability, reach, productivity, and impact on its own layer and in a collaborative layer
        with named partners. Interaction is saved with consent. Next steps open Hermes Community
        Chat and Gov Hub, not a static PDF.
      </p>
      <p className="mt-3 text-sm text-slate-500">{directory.directoryNote}</p>
      <ul className="mt-10 space-y-4">
        {orgs.map((org) => (
          <li key={org.slug} className="rounded-xl border border-slate-800 bg-slate-900/30 p-5">
            <Link
              href={`/onboard/alliance/${org.slug}`}
              className="text-lg font-semibold text-cyan-300 hover:text-cyan-200"
            >
              {org.name}
            </Link>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{org.mission}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
