import Link from 'next/link';
import ChallengeActivity from '@/components/ChallengeActivity';
import ChallengeCountdown from '@/components/ChallengeCountdown';
import ChallengeTimeline from '@/components/ChallengeTimeline';
import WorkgroupFormationStatus from '@/components/WorkgroupFormationStatus';
import {
  challengeMeta,
  getActiveAndUpcoming,
  getCurrentMilestone,
  getPastMilestones,
  isBeforeWorkgroupFormation,
  isWorkgroupFormationPhase,
} from '@/lib/challengeTimeline';
import {
  DESIRABLE_PROPERTIES_BOOK_URL,
  fetchChallengeActivity,
  fetchChallengeWorkgroups,
  FRAMING_CHAPTER_URL,
  govhubUrl,
} from '@/lib/govhub';

export const metadata = {
  title: 'The Challenge – Desirable Properties',
  description:
    'Timeline, milestones, and participation guide for the Desirable Properties Challenge–refining Version 0.77 toward Version 1 and the Digital Monument launch.',
};

export const revalidate = 300;

export default async function ChallengePage() {
  const now = new Date();
  const [activity, workgroups] = await Promise.all([
    fetchChallengeActivity(8),
    fetchChallengeWorkgroups(),
  ]);

  const current = getCurrentMilestone(now);
  const activeAndUpcoming = getActiveAndUpcoming(now);
  const past = getPastMilestones(now);
  const showWorkgroupPanel =
    isWorkgroupFormationPhase(now) || isBeforeWorkgroupFormation(now);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <Link href="/" className="text-sm text-cyan-300 hover:text-cyan-200">
        ← Back to home
      </Link>

      <header className="mt-8 border-b border-slate-800 pb-10">
        <p className="text-sm font-medium uppercase tracking-[0.15em] text-cyan-400">
          Desirable Properties Challenge
        </p>
        <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">
          The Desirable Properties Challenge
        </h1>
        {current && (
          <p className="mt-4 inline-flex rounded-full border border-cyan-800/60 bg-cyan-950/40 px-3 py-1 text-sm text-cyan-200">
            Current phase: {current.title}
          </p>
        )}
      </header>

      <div className="mt-10 space-y-14">
        {/* Overview narrative */}
        <section className="space-y-4 text-lg leading-relaxed text-slate-300">
          <p>The Internet is entering a new era.</p>
          <p>
            For more than thirty years, the Web has connected people through pages, platforms, and
            applications. Yet many of the challenges we now face are no longer problems of
            connectivity alone. They are problems of trust, context, governance, identity, and our
            ability to coordinate across communities, institutions, and increasingly, intelligent
            agents.
          </p>
          <p>
            The Desirable Properties Challenge is a global effort to explore what qualities a new{' '}
            <strong className="font-semibold text-white">Coordination Layer</strong>
            {' '}
            should possess before it becomes part of everyday digital life–the Meta-Layer that
            supports trust, context, presence, and governance above today&apos;s Web.
          </p>
          <p>
            The challenge began in September 2024 when Internet pioneer Vint Cerf asked a
            deceptively simple question: if we are building a new layer above today&apos;s Web,
            what desirable properties should define it? Rather than beginning with protocols or
            technical standards, he encouraged us to begin with the conditions that would make such
            a layer trustworthy, resilient, and beneficial for humanity.
          </p>
          <p>
            That question launched two international Calls for Input. Contributors from around the
            world submitted ideas, concerns, use cases, and aspirations for the future of the
            Internet. Those contributions were preserved as Bitcoin Ordinal inscriptions, creating a
            permanent public record of the community&apos;s thinking. They also informed{' '}
            <strong className="font-semibold text-white">
              Version {challengeMeta.current_draft_version}
            </strong>{' '}
            of the <em>Desirable Properties of a Meta-Layer</em>–the current working draft developed
            through AI-assisted synthesis and community stewardship.
          </p>
        </section>

        {/* Countdown */}
        <section>
          <ChallengeCountdown initialNow={now.toISOString()} />
          <p className="mt-4 text-center text-sm text-slate-400">
            Workgroups form July 1–20; the Desirable Properties book launches September 16, 2026.{' '}
            <Link
              href="/challenge#timeline"
              className="font-medium text-cyan-300 hover:text-cyan-200"
            >
              View full timeline →
            </Link>
          </p>
        </section>

        {/* New phase */}
        <section className="space-y-4 text-lg leading-relaxed text-slate-300">
          <h2 className="text-2xl font-bold text-white">A new phase</h2>
          <p>
            Today the project enters a new phase. The Desirable Properties Challenge invites people
            everywhere to refine, debate, test, and improve these living drafts using Meta-Layer
            tools. Over the coming months, workgroups will gather commentary, propose patches, and
            explore implementations that strengthen the overall coherence of the emerging
            framework. Every improvement helps move the work from exploration toward rough consensus
            while preserving a transparent history of how the ideas evolved.
          </p>
        </section>

        {/* Timeline */}
        <section id="timeline" className="scroll-mt-24">
          <h2 className="text-2xl font-bold text-white">Timeline</h2>
          <p className="mt-3 text-slate-400">
            Follow the challenge from its origins through the launch of Version{' '}
            {challengeMeta.target_version} and the Digital Monument on September 16, 2026.
          </p>
          <div className="mt-8">
            <ChallengeTimeline activeAndUpcoming={activeAndUpcoming} past={past} />
          </div>
        </section>

        {/* Workgroup formation */}
        {showWorkgroupPanel && (
          <section>
            <WorkgroupFormationStatus workgroups={workgroups} />
          </section>
        )}

        {/* Workspace + Archive */}
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="text-lg font-semibold text-white">Living workspace</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Review drafts, join workgroups, propose patches, and participate in governance on Gov
              Hub–the active environment where the challenge evolves.
            </p>
            <a
              href={govhubUrl('/layers/the-metaweb/')}
              className="mt-4 inline-block text-sm font-medium text-cyan-300 hover:text-cyan-200"
            >
              Open Gov Hub →
            </a>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="text-lg font-semibold text-white">Permanent archive</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              PCI conversations, Second Call submissions, and inscribed DP drafts are preserved
              on-chain as part of the Digital Monument.
            </p>
            <Link
              href="/onchain"
              className="mt-4 inline-block text-sm font-medium text-cyan-300 hover:text-cyan-200"
            >
              Explore on-chain provenance →
            </Link>
          </div>
          <div className="rounded-xl border border-violet-900/50 bg-violet-950/20 p-6">
            <h3 className="text-lg font-semibold text-white">Desirable Properties book</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Read the v1.0 open edition–framing chapter plus twenty-two inscribed DPs organized in
              seven parts. Same markdown ordinals as the Digital Monument.
            </p>
            <a
              href={DESIRABLE_PROPERTIES_BOOK_URL}
              className="mt-4 inline-block text-sm font-medium text-violet-300 hover:text-violet-200"
            >
              Open the book →
            </a>
          </div>
        </section>

        {/* Recent activity */}
        <section>
          <h2 className="text-2xl font-bold text-white">Recent activity</h2>
          <div className="mt-4">
            <ChallengeActivity items={activity} />
          </div>
        </section>

        {/* Closing */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-slate-300">
          <p className="leading-relaxed">
            This site is both a living workspace and a permanent archive. It preserves the ideas
            that brought us here while inviting everyone to help shape what comes next. The
            Coordination Layer will not be built by a single organization or technology. It will
            emerge through many communities working together to define the conditions under which
            trust, context, presence, and governance can flourish.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/#dps"
              className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
            >
              Browse Version {challengeMeta.current_draft_version} DPs
            </Link>
            <a
              href={DESIRABLE_PROPERTIES_BOOK_URL}
              className="rounded-lg border border-violet-700/60 bg-violet-950/30 px-4 py-2 text-sm text-violet-200 hover:border-violet-500"
            >
              Read the book
            </a>
            <Link
              href="/about"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
            >
              About the challenge
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
