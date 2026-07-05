import Link from 'next/link';
import ChallengeActivity from '@/components/ChallengeActivity';
import DPCardGrid from '@/components/DPCardGrid';
import LayerHero from '@/components/LayerHero';
import WorkgroupCountdownOverlay from '@/components/WorkgroupCountdownOverlay';
import {
  fetchChallengeActivity,
  fetchChallengeWorkgroups,
  govhubUrl,
} from '@/lib/govhub';
import localData from '../data/desirable-properties.json';

export const revalidate = 300;

const PARTICIPATE_ITEMS = [
  'Review drafts',
  'Suggest improvements',
  'Join workgroups',
  'Surface implementation ideas',
  'Propose new DPs',
  'Test properties through applications such as Canopi',
];

const MISSING_ITEMS = [
  'Candidate DPs',
  'Missing requirements',
  'Emerging challenges',
  'New implementation opportunities',
];

export default async function Home() {
  const now = new Date();
  const [activity, workgroups] = await Promise.all([
    fetchChallengeActivity(12),
    fetchChallengeWorkgroups(),
  ]);

  const dps = localData.desirable_properties;
  const activeWorkgroups = workgroups.filter((wg) => wg.status === 'active').length;

  return (
    <main>
        {/* TODO: remove `hidden` and place overlay in hero or challenge section when ready */}
        <div className="hidden" aria-hidden="true">
          <WorkgroupCountdownOverlay initialNow={now.toISOString()} />
        </div>

        <LayerHero workgroupHref="/workgroups/join" />

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
                  Version 0.77 is open for review. Workgroups form July 1–15; the Desirable
                  Properties book launches September 18, 2026.{' '}
                  <Link href="/challenge" className="text-cyan-300 hover:text-cyan-200">
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
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PARTICIPATE_ITEMS.map((item) => (
                <li
                  key={item}
                  className="rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3 text-slate-300"
                >
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-10">
              <h3 className="text-lg font-semibold text-white">Recent activity</h3>
              <div className="mt-4">
                <ChallengeActivity items={activity} />
              </div>
              <p className="mt-4 text-sm text-slate-500">
                <a href={govhubUrl('/layers/the-metaweb/')} className="text-cyan-300 hover:text-cyan-200">
                  View governance discussions on Gov Hub
                </a>
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
        <section className="border-b border-slate-800">
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
                href={govhubUrl('/layers/the-metaweb/')}
                className="rounded-lg bg-cyan-700 px-5 py-3 text-sm font-medium text-white hover:bg-cyan-600"
              >
                Submit Candidate DP
              </a>
              <a
                href={govhubUrl('/layers/the-metaweb/')}
                className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-medium text-slate-200 hover:border-slate-500"
              >
                Join DP Discovery Workgroup
              </a>
            </div>
          </div>
        </section>

        {/* Get Involved */}
        <section>
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-3xl font-bold text-white">Get Involved</h2>
            <ul className="mt-8 space-y-3">
              <li>
                <Link href="/challenge" className="text-lg text-cyan-300 hover:text-cyan-200">
                  Challenge timeline
                </Link>
                <p className="text-sm text-slate-500">
                  Milestones, countdown to the book launch, and how to participate
                </p>
              </li>
              <li>
                <Link href="/about" className="text-lg text-cyan-300 hover:text-cyan-200">
                  About the Challenge
                </Link>
                <p className="text-sm text-slate-500">Framing, origins, and why properties precede protocols</p>
              </li>
              <li>
                <a href={govhubUrl('/')} className="text-lg text-cyan-300 hover:text-cyan-200">
                  Gov Hub
                </a>
                <p className="text-sm text-slate-500">Drafts, proposals, and layer governance</p>
              </li>
              <li>
                <Link href="/onchain" className="text-lg text-cyan-300 hover:text-cyan-200">
                  Meta-Layer Call for Input
                </Link>
                <p className="text-sm text-slate-500">
                  On-chain provenance: PCI conversations, submissions, and inscriptions
                </p>
              </li>
              <li>
                <a
                  href={govhubUrl('/layers/the-metaweb/')}
                  className="text-lg text-cyan-300 hover:text-cyan-200"
                >
                  Workgroups
                </a>
                <p className="text-sm text-slate-500">Join stewardship groups for each DP</p>
              </li>
              <li>
                <a
                  href={govhubUrl('/layers/the-metaweb/')}
                  className="text-lg text-cyan-300 hover:text-cyan-200"
                >
                  Governance discussions
                </a>
                <p className="text-sm text-slate-500">Votes, comments, and proposals on The Metaweb layer</p>
              </li>
            </ul>
          </div>
        </section>
      </main>
  );
}
