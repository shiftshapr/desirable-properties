import Link from 'next/link';
import PadOrgLookup from '@/components/onboard/PadOrgLookup';
import { listAllianceOrgs } from '@/lib/hermes-onboard/directory';
import { padAbsoluteHref, padHref, padPublicBase } from '@/lib/hermes-onboard/tabs';

export default async function PadIndexContent() {
  const orgs = listAllianceOrgs();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-medium uppercase tracking-[0.15em] text-cyan-400">
        Desirable Properties Studio · Public beta
      </p>
      <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Welcome to our Pad!</h1>
      <p className="mt-4 text-lg leading-relaxed text-slate-300">
        A landing pad is built for dialogue. They learn from your choices (with consent), suggest how
        your perspective might be read, and let you refine how your perspectives are captured.
      </p>
      <p className="mt-3 text-base leading-relaxed text-slate-400">
        Everyone has a unique pad based on their public corpus. Our Community assistant Hermes
        analyzes the information to which we have access and attempts to match it to the desirable
        properties. We want to know if we characterized your perspectives correctly. Follow an
        interest until it becomes a patch idea. Learning uses session memory, confirms, and chosen
        sources, not silent profiling. Suppositions stay hypotheses until you confirm.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">
        Version 0.77 is open for review now. Version 1.0 of <em>The Layered Web</em> and the public
        launch of DP Studio are September 16, 2026.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">
        Curated public packet for DP Studio landing pads.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-slate-400">
        Each org has a direct link:{' '}
        <span className="font-mono text-slate-300">{padPublicBase()}/pad/your-org-name</span>{' '}
        (hyphens optional, e.g.{' '}
        <span className="font-mono text-slate-300">{padPublicBase()}/pad/yourorgname</span> or{' '}
        <span className="font-mono text-slate-300">{padPublicBase()}/pad/your-org-name</span>
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
