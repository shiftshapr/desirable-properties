import Link from 'next/link';
import ActivityToastHost from '@/components/ActivityToastHost';
import ChallengeActivity from '@/components/ChallengeActivity';
import DiscussPatchLink from '@/components/DiscussPatchLink';
import DPCardGrid from '@/components/DPCardGrid';
import FeaturedPathwayPanel from '@/components/pathways/FeaturedPathwayPanel';
import LayerHero from '@/components/LayerHero';
import WorkgroupCountdownOverlay from '@/components/WorkgroupCountdownOverlay';
import { fetchUnifiedActivity } from '@/lib/activity-feed';
import {
  fetchChallengeWorkgroups,
  govhubUrl,
  bookDiscussHref,
  DESIRABLE_PROPERTIES_BOOK_HOST,
  GOVHUB_DP_PATCHES_URL,
} from '@/lib/govhub';
import { WORKGROUPS_LIST_HREF } from '@/lib/routes';
import localData from '../data/desirable-properties.json';

export const revalidate = 0;

const MISSING_ITEMS = [
  'Candidate DPs',
  'Missing requirements',
  'Emerging challenges',
  'New implementation opportunities',
];

export default async function Home() {
  const now = new Date();
  const [activity, workgroups] = await Promise.all([
    fetchUnifiedActivity(12),
    fetchChallengeWorkgroups(),
  ]);

  const dps = localData.desirable_properties;
  const activeWorkgroups = workgroups.filter((wg) => wg.status === 'active').length;

  return (
    <main>
        <ActivityToastHost initialItems={activity} />
        {/* TODO: remove `hidden` and place overlay in hero or challenge section when ready */}
        <div className="hidden" aria-hidden="true">
          <WorkgroupCountdownOverlay initialNow={now.toISOString()} />
        </div>

        <LayerHero workgroupHref={WORKGROUPS_LIST_HREF} />

        <FeaturedPathwayPanel />

        {/* What Are Desirable Properties? */}
        <section className="border-b border-slate-800 bg-slate-900/40">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-3xl font-bold text-white">What Are Desirable Properties?</h2>
            <div className="mt-6 max-w-3xl space-y-4 text-lg leading-relaxed text-slate-300">
              <p>
                Desirable Properties provide the shared design criteria for a Meta-Layer that
                supports trust, agency, safety, accountability, contextual integrity, collective
                intelligence, and human flourishing.
              </p>
              <p>
                The challenge is to continually refine, test, and operationalize these properties
                through governance, implementation, and real-world experimentation.{' '}
                <Link href="/about" className="text-cyan-300 hover:text-cyan-200">
                  Read the full framing on About
                </Link>
                .
              </p>
            </div>
          </div>
        </section>

        {/* Current DP Challenge */}
        <section id="challenge" className="border-b border-slate-800">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-3xl font-bold text-white">Current DP Challenge</h2>
                <p className="mt-3 max-w-2xl text-slate-400">
                  Version 0.77 is open for review.{' '}
                  <Link href="/challenge#timeline" className="text-cyan-300 hover:text-cyan-200">
                    View full timeline →
                  </Link>
                </p>
              </div>
              <div className="flex gap-6 text-sm text-slate-400">
                <p>
                  <span className="block text-2xl font-semibold text-white">{dps.length}</span>
                  canonical DPs
                </p>
                <p>
                  <span className="block text-2xl font-semibold text-white">{activeWorkgroups}</span>
                  active workgroups
                </p>
              </div>
            </div>
            <div className="mt-10">
              <h3 className="text-lg font-semibold text-white">Recent activity</h3>
              <div className="mt-4">
                <ChallengeActivity items={activity} />
              </div>
              <p className="mt-4 text-sm text-slate-500">
                <Link href="/activity" className="text-cyan-300 hover:text-cyan-200">
                  View full activity feed →
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* Browse the DPs */}
        <section id="dps" className="border-b border-slate-800 bg-slate-900/40">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-3xl font-bold text-white">Browse the DPs</h2>
            <div className="mt-10">
              <DPCardGrid localDps={dps} workgroups={workgroups} />
            </div>
          </div>
        </section>

        {/* Missing Something? */}
        <section id="missing" className="border-b border-slate-800">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-3xl font-bold text-white">Missing Something?</h2>
            <p className="mt-4 max-w-2xl text-lg text-slate-300">
              The current DPs are not assumed to be complete.
            </p>
            <p className="mt-2 max-w-2xl text-lg font-medium text-white">
              Have we missed a property?
            </p>
            <p className="mt-4 text-slate-400">Help identify:</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {MISSING_ITEMS.map((item) => (
                <li
                  key={item}
                  className="rounded-lg border border-amber-900/40 bg-amber-950/20 px-4 py-3 text-amber-100/90"
                >
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={govhubUrl('/submit/?layer=the-metaweb')}
                className="rounded-lg bg-cyan-700 px-5 py-3 text-sm font-medium text-white hover:bg-cyan-600"
              >
                Submit Candidate DP
              </a>
              <Link
                href="/workgroups/dp-discovery"
                className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-medium text-slate-200 hover:border-slate-500"
              >
                DP Discovery workgroup
              </Link>
            </div>
          </div>
        </section>

        {/* Three ways to get involved — maps directly to the three primary journeys */}
        <section>
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-3xl font-bold text-white">Three Ways to Get Involved</h2>
            <p className="mt-3 max-w-2xl text-slate-400">
              Pick a path — or do all three.
            </p>
            <ul className="mt-10 grid gap-5 sm:grid-cols-3">
              <li className="flex h-full flex-col rounded-xl border border-slate-800 bg-slate-900/50 p-6">
                <span className="text-2xl" aria-hidden>
                  🤝
                </span>
                <h3 className="mt-3 text-lg font-semibold text-white">Join a Workgroup</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">
                  Help steward one or more Desirable Properties toward Version 1.0.
                </p>
                <Link
                  href={WORKGROUPS_LIST_HREF}
                  className="mt-5 inline-flex w-fit items-center rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-950/40 hover:from-violet-500 hover:to-blue-500"
                >
                  Browse the 23 workgroups →
                </Link>
              </li>
              <li className="flex h-full flex-col rounded-xl border border-slate-800 bg-slate-900/50 p-6">
                <span className="text-2xl" aria-hidden>
                  💬
                </span>
                <h3 className="mt-3 text-lg font-semibold text-white">Discuss &amp; Patch</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">
                  Chapter comments are live on {DESIRABLE_PROPERTIES_BOOK_HOST}. Passage-level patching
                  on the book is coming soon.
                </p>
                <DiscussPatchLink
                  href={bookDiscussHref()}
                  className="mt-5 inline-flex w-fit items-center rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-500"
                >
                  Open the book →
                </DiscussPatchLink>
              </li>
              <li className="flex h-full flex-col rounded-xl border border-slate-800 bg-slate-900/50 p-6">
                <span className="text-2xl" aria-hidden>
                  ✎
                </span>
                <h3 className="mt-3 text-lg font-semibold text-white">Patch a Draft on Gov Hub</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">
                  Select a passage in any DP draft and submit a specific text revision today.
                </p>
                <a
                  href={GOVHUB_DP_PATCHES_URL}
                  className="mt-5 inline-flex w-fit items-center rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-500"
                >
                  Open Gov Hub →
                </a>
              </li>
            </ul>

            <p className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
              <Link href="/participate" className="text-cyan-300 hover:text-cyan-200">
                More ways to contribute
              </Link>
              <Link href="/challenge#timeline" className="hover:text-slate-300">
                Challenge timeline
              </Link>
              <Link href="/about" className="hover:text-slate-300">
                About the Challenge
              </Link>
              <Link href="/onchain" className="hover:text-slate-300">
                On-chain provenance
              </Link>
            </p>
          </div>
        </section>
      </main>
  );
}
