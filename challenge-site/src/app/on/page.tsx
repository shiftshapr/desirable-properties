import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllianceDirectory, listAllianceOrgs } from '@/lib/hermes-onboard/directory';
import { getOnSettings } from '@/lib/hermes-onboard/settings';
import { onHref } from '@/lib/hermes-onboard/tabs';

export const metadata: Metadata = {
  title: 'On – member briefings',
  description:
    'Living briefings for member organizations: public corpus, Desirable Properties, own layer, partner layer, and Hermes Community Chat.',
};

export default async function OnIndexPage() {
  const directory = getAllianceDirectory();
  const orgs = listAllianceOrgs();
  const settings = await getOnSettings();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-medium uppercase tracking-[0.15em] text-cyan-400">On</p>
      <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">{directory.cohortLabel}</h1>
      <p className="mt-4 text-lg leading-relaxed text-slate-300">
        Each member organization has its own page because the invitation has to be specific. We
        started from their public corpus and we are asking: did we hear your concerns correctly?
        Follow an interest until it becomes a patch idea.
      </p>
      <p className="mt-3 text-sm text-slate-500">
        {directory.directoryNote} Default tab without a query string: {settings.defaultTab}.
      </p>
      <ul className="mt-10 space-y-4">
        {orgs.map((org) => (
          <li key={org.slug} className="rounded-xl border border-slate-800 bg-slate-900/30 p-5">
            <Link
              href={onHref(org.slug)}
              className="text-lg font-semibold text-cyan-300 hover:text-cyan-200"
            >
              {org.name}
            </Link>
            <p className="mt-1 font-mono text-xs text-slate-500">{onHref(org.slug)}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              {org.pitch?.headline || org.mission}
            </p>
            <p className="mt-3 text-xs text-slate-500">
              <Link href={onHref(org.slug, 'dp')} className="text-cyan-400 hover:text-cyan-200">
                Desirable Properties
              </Link>
              {' · '}
              <Link href={onHref(org.slug, 'brief')} className="text-cyan-400 hover:text-cyan-200">
                Brief
              </Link>
              {' · '}
              <Link href={onHref(org.slug, 'community')} className="text-cyan-400 hover:text-cyan-200">
                Community Chat
              </Link>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
