import type { Metadata } from 'next';
import Link from 'next/link';
import localData from '@/data/desirable-properties.json';
import ImproveExplorer from '@/components/improve/ImproveExplorer';
import type { ImproveDp, SeatSummary } from '@/components/improve/improve-shared';
import { IMPROVE_HERO, IMPROVE_STATS, LOOKING_TO_V2, PRIORITIES_V1_1, type ImprovePriority } from '@/data/improve-priorities';
import { DP_WORKGROUP_SLUGS } from '@/lib/dp-workgroup-slugs';
import { bookDiscussHref, bookViewerHref, fetchChallengeWorkgroups, GOVHUB_DP_PATCHES_URL, GOVHUB_PUBLIC_BASE_URL, govhubDraftReadHref } from '@/lib/govhub';
import { dpDetailHref } from '@/lib/dp-links';
import { isWorkgroupCollabEnabled } from '@/lib/workgroup-links.server';
import { workgroupGovHubHref } from '@/lib/workgroup-links';

export const dynamic = 'force-dynamic';

const BOOK = 'https://book.desirableproperties.org/';

export const metadata: Metadata = {
  title: 'Help shape Version 1.1 | Desirable Properties',
  description:
    'Version 1.0 of The Layered Web is out. Help shape Version 1.1: propose changes to any of the 24 Desirable Properties, take a co-editor seat, or join the steering committee.',
  openGraph: {
    title: 'Help shape Version 1.1',
    description: 'Propose, co-edit or steer the next revision of The Layered Web: The Desirable Properties of a Meta-Layer.',
  },
};

/** Public co-editor seats for one workgroup (anonymous view; viewer actions are loaded in the drawer). */
async function fetchSeats(workgroupId: string): Promise<SeatSummary | null> {
  try {
    const res = await fetch(`${GOVHUB_PUBLIC_BASE_URL}/api/workgroups/${encodeURIComponent(workgroupId)}/co-editors/`, {
      next: { revalidate: 300 },
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const d = (await res.json()) as { enabled?: boolean; seats?: unknown[]; seats_total?: number; open_seats?: number; editorial_freeze?: boolean };
    if (d.enabled === false || typeof d.seats_total !== 'number') return null;
    const filled = Array.isArray(d.seats) ? d.seats.length : Math.max(0, d.seats_total - (d.open_seats ?? 0));
    return {
      total: d.seats_total,
      filled,
      open: typeof d.open_seats === 'number' ? d.open_seats : Math.max(0, d.seats_total - filled),
      freeze: Boolean(d.editorial_freeze),
    };
  } catch {
    return null;
  }
}

function PriorityList({ items }: { items: ImprovePriority[] }) {
  return (
    <ol className="mt-6 grid gap-4 sm:grid-cols-2">
      {items.map((p, i) => (
        <li key={p.title} className="flex gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <span aria-hidden="true" className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-400/50 text-xs font-bold text-amber-300">
            {i + 1}
          </span>
          <div className="min-w-0">
            <h4 className="font-semibold text-white">{p.title}</h4>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">{p.body}</p>
            {p.link ? (
              <a href={p.link.href} className="mt-2 inline-block text-sm text-cyan-300 hover:text-cyan-200">
                {p.link.label} →
              </a>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

type PageProps = { searchParams: Promise<{ dp?: string }> };

export default async function ImprovePage({ searchParams }: PageProps) {
  const { dp: dpParam } = await searchParams;
  const [workgroups, collab] = await Promise.all([fetchChallengeWorkgroups().catch(() => []), isWorkgroupCollabEnabled()]);
  const bySlug = new Map(workgroups.map((wg) => [wg.slug, wg]));

  const dps: ImproveDp[] = await Promise.all(
    localData.desirable_properties.map(async (dp) => {
      const slug = DP_WORKGROUP_SLUGS[dp.id] ?? null;
      const wg = slug ? bySlug.get(slug) : undefined;
      const workgroupHref = slug ? (collab ? `/workgroups/${encodeURIComponent(slug)}` : workgroupGovHubHref(slug)) : null;
      return {
        id: dp.id,
        number: Number(dp.id.replace(/^DP/i, '')),
        title: dp.name,
        summary: (dp.landing_subtitle || dp.description || '').trim(),
        keywords: [dp.category, ...(dp.elements || []).map((e) => e.name)].filter(Boolean).join(' '),
        workgroupId: wg?.id ?? null,
        workgroupSlug: slug,
        workgroupHref,
        coEditorsHref: workgroupHref ? (collab ? `${workgroupHref}#co-editors` : workgroupHref) : null,
        nominateHref: slug ? (collab ? `/workgroups/${encodeURIComponent(slug)}?nominate=co-editor#co-editors` : workgroupGovHubHref(slug, 'nominate')) : null,
        discussHref: bookDiscussHref({ dpId: dp.id }),
        bookHref: bookViewerHref({ dpId: dp.id }),
        patchHref: govhubDraftReadHref(wg?.document_href) || GOVHUB_DP_PATCHES_URL,
        dpPageHref: dpDetailHref(dp.id, '/improve'),
        seats: wg?.id ? await fetchSeats(wg.id) : null,
      };
    }),
  );
  const initialDp = dpParam && /^dp\d{1,2}$/i.test(dpParam) ? dpParam.toUpperCase() : null;

  return (
    <main className="min-w-0 overflow-x-clip">
      <section
        aria-labelledby="improve-title"
        className="relative overflow-hidden border-b border-amber-400/30 bg-[radial-gradient(ellipse_at_80%_30%,rgba(217,164,65,0.16),transparent_55%),radial-gradient(ellipse_at_10%_90%,rgba(34,211,238,0.10),transparent_50%),linear-gradient(180deg,#05070d,#0b1120)]"
      >
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">{IMPROVE_HERO.eyebrow}</p>
          <h1 id="improve-title" className="mt-3 text-4xl font-bold leading-tight text-white sm:text-5xl">
            {IMPROVE_HERO.title}
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-200">{IMPROVE_HERO.lead}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href="#explore"
              className="inline-flex items-center rounded-lg bg-amber-400 px-6 py-3 text-base font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-300"
            >
              Find a DP to work on
            </a>
            <a href={BOOK} className="inline-flex items-center rounded-lg bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15">
              Read the book →
            </a>
            <Link href="/v1" className="inline-flex items-center rounded-lg border border-slate-600 px-5 py-3 text-sm font-semibold text-white hover:border-slate-400 hover:bg-white/5">
              About Version 1.0
            </Link>
          </div>

          <ul className="mt-10 grid gap-4 md:grid-cols-3">
            {IMPROVE_HERO.ways.map((w, i) => (
              <li key={w.key} className="rounded-xl border border-slate-700/80 bg-slate-950/50 p-5 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Way in {i + 1}</p>
                <p className="mt-1 text-lg font-semibold text-white">{w.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-300">{w.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-label="Version 1.0 in numbers" className="border-b border-slate-800 bg-slate-950">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-4">
          {IMPROVE_STATS.map(([n, label]) => (
            <div key={label}>
              <dt className="sr-only">{label}</dt>
              <dd className="text-3xl font-bold text-amber-300">{n}</dd>
              <dd className="mt-1 text-sm text-slate-400">{label}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="priorities-heading" className="border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Where help goes furthest</p>
          <h2 id="priorities-heading" className="sr-only">
            Priorities
          </h2>
          <h3 className="mt-2 text-3xl font-bold text-white">Priorities for Version 1.1</h3>
          <p className="mt-3 max-w-3xl text-slate-300">{PRIORITIES_V1_1.intro}</p>
          <PriorityList items={PRIORITIES_V1_1.items} />

          <h3 className="mt-14 text-3xl font-bold text-white">Looking to Version 2</h3>
          <p className="mt-3 max-w-3xl text-slate-300">{LOOKING_TO_V2.intro}</p>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LOOKING_TO_V2.items.map((p, i) => (
              <li key={p.title} className="relative rounded-xl border border-slate-800 bg-slate-900/40 p-5">
                <p className="text-xs font-semibold text-slate-500">Step {i + 2}</p>
                <h4 className="mt-1 font-semibold text-white">{p.title}</h4>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">{p.body}</p>
                {p.link ? (
                  <a href={p.link.href} className="mt-2 inline-block text-sm text-cyan-300 hover:text-cyan-200">
                    {p.link.label} →
                  </a>
                ) : null}
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-slate-400">{LOOKING_TO_V2.note}</p>
        </div>
      </section>

      <section id="explore" aria-labelledby="explore-heading" className="scroll-mt-20 bg-slate-950">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Explore</p>
          <h2 id="explore-heading" className="mt-2 text-3xl font-bold text-white">
            Find your DP
          </h2>
          <p className="mt-3 max-w-3xl text-slate-300">
            Search the 24 DPs and every proposal made on Version 1.0. Open a DP to see its open co-editor seats, propose a
            change, or review what has been proposed.
          </p>
          <ImproveExplorer dps={dps} initialDp={initialDp} />
        </div>
      </section>
    </main>
  );
}
