import Link from 'next/link';
import type { Metadata } from 'next';
import DpBadgeCarousel from '@/components/DpBadgeCarousel';
import { BRC333_BADGES_MINT_PREVIEW_BASE } from '@/lib/dp-images';
import localData from '@/data/desirable-properties.json';

export const metadata: Metadata = {
  title: 'Desirable Properties Badges',
  description:
    'Browse badge artwork for each Desirable Property, learn how recognition works, and open DP pages or book chapters.',
};

const HOW_IT_WORKS = [
  {
    title: 'One badge per Desirable Property',
    body: 'Contributing to a specific DP earns that property’s badge. Over time, contributors build a portfolio of the Meta-Layer areas they helped shape.',
  },
  {
    title: 'Role overlays',
    body: 'Badges can carry overlays such as Member, Workgroup Coordinator, Co-Lead, Reviewer, Patch Contributor, or Steward – reflecting how you participated.',
  },
  {
    title: 'Contribution evidence',
    body: 'Minted badges can link to patches, workgroup docs, discussions, PRs, research, and other public records – recognition tied to real work.',
  },
  {
    title: 'Not governance rights',
    body: 'Badges recognize contribution. They do not confer ownership, authority, or voting power by themselves.',
  },
] as const;

export default function BadgesPage() {
  const items = localData.desirable_properties.map((dp) => ({
    id: dp.id,
    name: dp.name,
  }));

  return (
    <main className="border-b border-slate-800">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">Recognition</p>
        <h1 className="mt-3 text-4xl font-bold text-white">Desirable Properties Badges</h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-300">
          Meaningful participation in the challenge will be recognized through property-specific
          badges on the BRC333 / Ordinals stack. Browse the artwork for all {items.length}{' '}
          Desirable Properties, then open a DP page or discuss its book chapter.
        </p>

        <div className="mt-10">
          <DpBadgeCarousel items={items} variant="page" />
        </div>

        <section className="mt-14">
          <h2 className="text-2xl font-bold text-white">How badges work</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {HOW_IT_WORKS.map((item) => (
              <li
                key={item.title}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-5"
              >
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14 rounded-2xl border border-violet-900/40 bg-violet-950/20 p-6 sm:p-8">
          <h2 className="text-xl font-bold text-white">See a live badge mint</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
            Badge issuance uses the BRC333 badges model (preview / mint tooling on app.brc333.xyz).
            The challenge site focuses on the visual catalog and how recognition maps to Desirable
            Properties; minting and wallet flows live in the BRC333 project.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={BRC333_BADGES_MINT_PREVIEW_BASE}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
            >
              Open badge preview ↗
            </a>
            <Link
              href="/participate#badges"
              className="inline-flex items-center rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
            >
              Participate narrative
            </Link>
            <Link
              href="/onchain"
              className="inline-flex items-center rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
            >
              On-chain monument
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
