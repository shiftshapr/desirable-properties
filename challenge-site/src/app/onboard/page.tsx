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
        Each member organization has its own page because the invitation has to be specific. We
        started from their public corpus and we are asking: did we hear your concerns correctly?
        The Desirable Properties tab is the lead-in: follow an interest until it becomes a patch
        idea. We want this coordination space written as community rules before the commercial
        internet pattern (no pause, then capture) repeats.
      </p>
      <p className="mt-3 text-sm text-slate-500">{directory.directoryNote}</p>
      <ul className="mt-10 space-y-4">
        {orgs.map((org) => (
          <li key={org.slug} className="rounded-xl border border-slate-800 bg-slate-900/30 p-5">
            <Link
              href={`/onboard/alliance/${org.slug}?tab=dp`}
              className="text-lg font-semibold text-cyan-300 hover:text-cyan-200"
            >
              {org.name}
            </Link>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              {org.pitch?.headline || org.mission}
            </p>
            <p className="mt-3 text-xs text-slate-500">
              <Link href={`/onboard/alliance/${org.slug}?tab=dp`} className="text-cyan-400 hover:text-cyan-200">
                Desirable Properties
              </Link>
              {' · '}
              <Link href={`/onboard/alliance/${org.slug}?tab=brief`} className="text-cyan-400 hover:text-cyan-200">
                Brief
              </Link>
              {' · '}
              <Link href={`/onboard/alliance/${org.slug}?tab=community`} className="text-cyan-400 hover:text-cyan-200">
                Community Chat
              </Link>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
