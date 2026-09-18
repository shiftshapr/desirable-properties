import Link from 'next/link';
import DiscussPatchLink from '@/components/DiscussPatchLink';
import TrackedLink from '@/components/TrackedLink';
import { COMMUNITY_REVIEW_EVENT } from '@/lib/community-review-event';
import {
  bookDiscussHref,
  GOVHUB_DP_PATCHES_URL,
  govhubUrl,
} from '@/lib/govhub';
import { WORKGROUPS_LIST_HREF } from '@/lib/routes';
import localData from '@/data/desirable-properties.json';

export const metadata = {
  title: 'Community Review Event – Desirable Properties',
  description:
    'Join the September 16, 2026 Desirable Properties Community Review Event. Learn how to patch, review, and help shape Version 1.0.',
};

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">{title}</h2>
      <div className="prose-section mt-5 space-y-4 text-lg leading-relaxed text-slate-300">
        {children}
      </div>
    </section>
  );
}

const FEATURED_DP_IDS = ['DP1', 'DP2', 'DP12', 'DP19', 'DP22'];

export default function CommunityReviewEventPage() {
  const featuredDps = FEATURED_DP_IDS.map((id) =>
    localData.desirable_properties.find((dp) => dp.id === id),
  ).filter(Boolean);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <Link href="/" className="text-sm text-cyan-300 hover:text-cyan-200">
        ← Home
      </Link>

      <header className="mt-8 border-b border-slate-800 pb-10">
        <p className="text-sm font-medium uppercase tracking-[0.15em] text-cyan-400">
          {COMMUNITY_REVIEW_EVENT.dateLabel}
        </p>
        <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">
          The Desirable Properties Community Review Event
        </h1>
        <p className="mt-4 text-lg text-slate-400">
          See how the properties are evolving into requirements, architecture decisions, and public
          infrastructure. Learn how to patch, review, and help shape Version 1.0.
        </p>
        <div className="mt-6">
          <TrackedLink
            href={COMMUNITY_REVIEW_EVENT.lumaUrl}
            eventName="community_review_landing_register_click"
            className="inline-flex items-center rounded-lg bg-cyan-700 px-5 py-3 text-sm font-medium text-white hover:bg-cyan-600"
          >
            Register now
          </TrackedLink>
        </div>
      </header>

      <nav className="mt-8 rounded-xl border border-slate-800 bg-slate-900/40 p-5 text-sm">
        <p className="font-medium text-slate-200">On this page</p>
        <ul className="mt-3 grid gap-2 text-cyan-300 sm:grid-cols-2">
          <li>
            <a href="#why-dps" className="hover:text-cyan-200">
              Why desirable properties
            </a>
          </li>
          <li>
            <a href="#what-happens" className="hover:text-cyan-200">
              What happens in the event
            </a>
          </li>
          <li>
            <a href="#design-loop" className="hover:text-cyan-200">
              The public design loop
            </a>
          </li>
          <li>
            <a href="#participate" className="hover:text-cyan-200">
              Ways to participate now
            </a>
          </li>
          <li>
            <a href="#register" className="hover:text-cyan-200">
              Register
            </a>
          </li>
          <li>
            <a href="#explore-dps" className="hover:text-cyan-200">
              Explore the properties
            </a>
          </li>
        </ul>
      </nav>

      <div className="mt-12 space-y-14">
        <Section id="why-dps" title="Why desirable properties">
          <p>
            A layer above the web needs public criteria before fixed implementation. Without shared
            Desirable Properties, builders risk shipping incompatible overlays, governance silos, and
            trust mechanisms that cannot interoperate.
          </p>
          <p>
            The Desirable Properties Challenge asks the community to define, test, and refine what
            that layer must protect and enable – from federated authentication to community-based AI
            governance – before substrate code hardens around the wrong assumptions.
          </p>
          <p>
            September 16 marks the Community Review Draft milestone: 23 properties organized in{' '}
            <em>The Layered Web</em>, open for patching, critique, and governance feedback on the
            path toward Version 1.0.
          </p>
        </Section>

        <Section id="what-happens" title="What happens in the event">
          <ul className="list-disc space-y-2 pl-5">
            <li>Walkthrough of the Desirable Properties system and challenge timeline</li>
            <li>Anatomy of a DP – structure, elements, and how drafts evolve</li>
            <li>Governance circuit demo – layers, workgroups, documents, and feedback loops</li>
            <li>Site and tool tour – book, Gov Hub patching, workgroups, and activity feeds</li>
            <li>Contribution pathways – how to patch language, join a workgroup, or bring use cases</li>
          </ul>
        </Section>

        <Section id="design-loop" title="The public design loop">
          <p>The event shows how community input moves through the build process:</p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              <strong className="text-white">Desirable Properties (DPs)</strong> – community-defined
              criteria and design principles
            </li>
            <li>
              <strong className="text-white">Meta-Layer Requirements (ML-REQs)</strong> – testable
              requirements derived from accepted properties
            </li>
            <li>
              <strong className="text-white">Architecture Decision Records (ML-ADRs)</strong> –
              documented choices that shape implementation
            </li>
            <li>
              <strong className="text-white">Substrate</strong> – shared technical foundation for
              overlays and coordination tools
            </li>
            <li>
              <strong className="text-white">Implementation evidence</strong> – prototypes, pilots,
              and real-world experiments
            </li>
            <li>
              <strong className="text-white">Updated drafts</strong> – refined DPs informed by what
              worked and what is still missing
            </li>
          </ol>
        </Section>

        <Section id="participate" title="Ways to participate now">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-white">Patch language</strong> – submit specific text revisions
              on Gov Hub or discuss chapters on the book
            </li>
            <li>
              <strong className="text-white">Join a workgroup</strong> – steward one or more DPs toward
              Version 1.0
            </li>
            <li>
              <strong className="text-white">Bring use cases</strong> – share scenarios that test
              whether the properties hold up in practice
            </li>
            <li>
              <strong className="text-white">Identify missing requirements</strong> – propose candidate
              DPs or extensions the current set does not cover
            </li>
            <li>
              <strong className="text-white">Support translation and synthesis</strong> – help turn
              community feedback into coherent draft updates
            </li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={GOVHUB_DP_PATCHES_URL}
              className="rounded-lg bg-cyan-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-cyan-600"
            >
              Patch on Gov Hub
            </a>
            <DiscussPatchLink
              href={bookDiscussHref()}
              className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-500"
            >
              Open the book
            </DiscussPatchLink>
            <Link
              href={WORKGROUPS_LIST_HREF}
              className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-500"
            >
              Browse workgroups
            </Link>
            <a
              href={govhubUrl('/submit/?layer=the-metaweb')}
              className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-500"
            >
              Submit candidate DP
            </a>
          </div>
        </Section>

        <Section id="register" title="Register">
          <p>
            Join us virtually on {COMMUNITY_REVIEW_EVENT.shortDate}. Registration is free and open
            to all.
          </p>
          <TrackedLink
            href={COMMUNITY_REVIEW_EVENT.lumaUrl}
            eventName="community_review_landing_register_bottom_click"
            className="inline-flex items-center rounded-lg bg-cyan-700 px-5 py-3 text-sm font-medium text-white hover:bg-cyan-600"
          >
            Register on Luma
          </TrackedLink>
          <p className="text-base text-slate-400">
            For the broader civic infrastructure framing, see the{' '}
            <a
              href={COMMUNITY_REVIEW_EVENT.mliLandingPath}
              className="text-cyan-300 hover:text-cyan-200"
            >
              Meta-Layer Initiative event page
            </a>
            .
          </p>
        </Section>

        <Section id="explore-dps" title="Explore the properties">
          <p>Start with these featured Desirable Properties before the event:</p>
          <ul className="mt-4 grid gap-3">
            {featuredDps.map((dp) =>
              dp ? (
                <li key={dp.id}>
                  <Link
                    href={`/dp/${dp.id.toLowerCase()}`}
                    className="block rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3 transition hover:border-cyan-800/60 hover:bg-cyan-950/20"
                  >
                    <span className="font-semibold text-white">
                      {dp.id} – {dp.name}
                    </span>
                    <span className="mt-1 block text-sm text-slate-400">{dp.category}</span>
                  </Link>
                </li>
              ) : null,
            )}
          </ul>
          <p className="mt-4">
            <Link href="/#dps" className="text-cyan-300 hover:text-cyan-200">
              Browse all 23 DPs →
            </Link>
          </p>
        </Section>
      </div>
    </main>
  );
}
