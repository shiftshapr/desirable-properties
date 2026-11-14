import Link from 'next/link';
import BlueberriesWidget from '@/components/BlueberriesWidget';
import DiscussPatchLink from '@/components/DiscussPatchLink';
import DpBadgeCarousel from '@/components/DpBadgeCarousel';
import NamedTabLink from '@/components/NamedTabLink';
import localData from '@/data/desirable-properties.json';
import {
  bookDiscussHref,
  DESIRABLE_PROPERTIES_BOOK_HOST,
  GOVHUB_DP_PATCHES_URL,
  govhubUrl,
} from '@/lib/govhub';
import { resolveNamedTabTarget } from '@/lib/named-tab';
import { WORKGROUPS_LIST_HREF } from '@/lib/routes';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

function PageLink({
  href,
  className,
  children,
  discussPatch,
}: {
  href: string;
  className: string;
  children: ReactNode;
  discussPatch?: boolean;
}) {
  if (discussPatch) {
    return (
      <DiscussPatchLink href={href} className={className}>
        {children}
      </DiscussPatchLink>
    );
  }
  if (resolveNamedTabTarget(href)) {
    return (
      <NamedTabLink href={href} className={className}>
        {children}
      </NamedTabLink>
    );
  }
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export const metadata: Metadata = {
  title: 'More contribution paths – Desirable Properties Challenge',
  description:
    'Version 1.0 is finished. Read and discuss the book, propose changes toward Version 1.1, join a workgroup or take a co-editor seat, or join the V1.1 steering committee.',
};

const FOUNDATION_USES = [
  'defining the minimum requirements for the Meta-Layer substrate',
  'evaluating architecture decisions through Architecture Decision Records (ADRs)',
  'informing technical specifications and ML-RFCs',
  'guiding implementations across independent projects',
  'ensuring the underlying infrastructure enables human agency, trust, interoperability, and collective intelligence',
];

const CONTRIBUTE_CARDS = [
  {
    id: 'read',
    emoji: '📖',
    title: 'Read and discuss Version 1.0',
    time: '≈30 minutes and up',
    body: (
      <>
        <p>
          Version 1.0 of <em>The Layered Web: The Desirable Properties of a Meta-Layer</em> is
          published. Read it online at{' '}
          <a href="https://book.desirableproperties.org/" className="text-cyan-300 hover:text-cyan-200">
            book.desirableproperties.org
          </a>{' '}
          or{' '}
          <a href="/downloads/desirable-properties-v1.0.pdf" className="text-cyan-300 hover:text-cyan-200">
            download the PDF
          </a>
          .
        </p>
        <p className="mt-4">
          Every page of the book has a discussion layer. Comment on a passage, ask a question, or
          reply to others. Good discussion is often where the next proposal starts.
        </p>
        <p className="mt-4">
          Curious how Version 1.0 was decided? The{' '}
          <Link href="/steering" className="text-cyan-300 hover:text-cyan-200">
            decision record
          </Link>{' '}
          shows all 1,635 proposals and how each was resolved.
        </p>
      </>
    ),
    cta: {
      href: bookDiscussHref(),
      label: 'Read & discuss on the book →',
      primary: true,
      discussPatch: true,
    },
    secondaryCta: {
      href: '/v1',
      label: 'About Version 1.0',
    },
  },
  {
    id: 'propose',
    emoji: '✏️',
    title: 'Propose changes toward Version 1.1',
    time: '≈10 minutes to 3 hours',
    body: (
      <>
        <p>
          Version 1.1 is an open revision. It picks up everything deferred from 1.0, including the
          MTPs and glossaries. Propose a change two ways:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            <strong className="font-semibold text-white">On the book</strong> – select a passage on{' '}
            <DiscussPatchLink
              href={bookDiscussHref()}
              className="text-cyan-300 hover:text-cyan-200"
            >
              {DESIRABLE_PROPERTIES_BOOK_HOST}
            </DiscussPatchLink>{' '}
            and propose new wording in the discussion layer.
          </li>
          <li>
            <strong className="font-semibold text-white">On Gov Hub</strong> – open a document,
            select a passage, and submit a specific text revision on{' '}
            <a href={GOVHUB_DP_PATCHES_URL} className="text-cyan-300 hover:text-cyan-200">
              Gov Hub
            </a>
            .
          </li>
        </ul>
        <p className="mt-4">
          Already have ideas in a paper, notes, or a project? The{' '}
          <Link href="/agent" className="text-cyan-300 hover:text-cyan-200">
            DP Community AI
          </Link>{' '}
          can compare them with the published properties, find gaps, and help you draft a proposal.
        </p>
      </>
    ),
    cta: {
      href: bookDiscussHref(),
      label: 'Propose on the book →',
      primary: true,
      discussPatch: true,
    },
    secondaryCta: {
      href: GOVHUB_DP_PATCHES_URL,
      label: 'Propose on Gov Hub',
    },
  },
  {
    id: 'workgroup',
    emoji: '🤝',
    title: 'Join a workgroup or take a co-editor seat',
    time: '≈2–10+ hours',
    body: (
      <>
        <p>
          Each Desirable Property has a workgroup. Members discuss proposals for that property and
          help shape Version 1.1.
        </p>
        <p className="mt-4">
          Each DP now has up to three co-editor seats. Co-editors review proposals for their
          property, and any two of them can approve a proposal. If you know a property well, this is
          where you&apos;ll have the greatest impact.
        </p>
        <p className="mt-4">
          The DP Community AI helps by clustering related proposals, surfacing open questions, and
          comparing alternatives. People make the decisions.
        </p>
      </>
    ),
    cta: { href: WORKGROUPS_LIST_HREF, label: 'Join a workgroup', primary: true },
    secondaryCta: {
      href: '/co-editors',
      label: 'Read the co-editor guide',
    },
  },
  {
    id: 'steering',
    emoji: '🧭',
    title: 'Join the V1.1 steering committee',
    time: 'Ongoing',
    body: (
      <>
        <p>
          The steering committee for Version 1.0 has closed its work. A new committee will guide
          Version 1.1: it keeps the process moving, settles questions co-editors can&apos;t, and
          signs off the finished documents.
        </p>
        <p className="mt-4">
          To volunteer, send a request through the support page. Tell us which properties you know
          best and how much time you can give.
        </p>
      </>
    ),
    cta: { href: '/support', label: 'Volunteer via support →', primary: true },
    secondaryCta: {
      href: '/steering',
      label: 'See the V1.0 decision record',
    },
  },
] as const;

const BADGE_SECTIONS = [
  {
    title: 'One badge per Desirable Property',
    body: 'Contributing to a specific DP earns that property’s badge. Over time, contributors build a portfolio of the Meta-Layer areas they helped shape.',
  },
  {
    title: 'Role overlays',
    body: 'Badges can carry overlays such as Member, Co-editor, Workgroup Coordinator, Reviewer, Patch Contributor, or Steward – reflecting how you participated.',
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

const FINAL_CTAS = [
  {
    emoji: '📖',
    title: 'Read and discuss',
    description: 'Read Version 1.0 online and join the discussion on any page.',
    href: bookDiscussHref(),
    primary: true,
    discussPatch: true,
  },
  {
    emoji: '✏️',
    title: 'Propose a change',
    description: 'Propose changes toward Version 1.1 on Gov Hub.',
    href: GOVHUB_DP_PATCHES_URL,
    primary: false,
  },
  {
    emoji: '🤝',
    title: 'Join a workgroup',
    description: 'Join a DP workgroup or take one of up to three co-editor seats.',
    href: WORKGROUPS_LIST_HREF,
    primary: false,
  },
  {
    emoji: '🧭',
    title: 'Join the steering committee',
    description: 'Volunteer for the V1.1 steering committee through the support page.',
    href: '/support',
    primary: false,
  },
] as const;

function Section({
  id,
  title,
  children,
  className = '',
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`scroll-mt-20 ${className}`}>
      <h2 className="text-3xl font-bold text-white">{title}</h2>
      <div className="mt-5 space-y-4 text-lg leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function ParticipatePage() {
  return (
    <main className="border-b border-slate-800">
      {/* Hero */}
      <section className="border-b border-slate-800 bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <Link href="/" className="text-sm text-cyan-300 hover:text-cyan-200">
            ← Back to the Challenge
          </Link>
          <p className="mt-6 rounded-lg border border-cyan-800/50 bg-cyan-950/20 px-4 py-3 text-sm text-slate-300">
            New to the Challenge? Use <Link href="/start-here" className="text-cyan-300 hover:text-cyan-200">Start Here</Link> for
            the quickest way in. This page is the longer catalog (workgroups, co-editor seats, the
            steering committee, and badges).
          </p>
          <p className="mt-6 text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
            Desirable Properties Challenge
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight text-white sm:text-5xl">
            More contribution paths
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-300">
            The Desirable Properties define what the Meta-Layer should make possible for humanity.{' '}
            <strong className="font-semibold text-white">Version 1.0 is finished.</strong> All 24
            properties are published as a book, shaped by 1,635 decided proposals. The next step is{' '}
            <strong className="font-semibold text-white">Version 1.1</strong>, an open revision, and
            you can help shape it now.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/start-here"
              className="rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-violet-950/40 hover:from-violet-500 hover:to-blue-500"
            >
              Start Here (recommended) →
            </Link>
            <a
              href="#contribute"
              className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-medium text-slate-200 hover:border-slate-500"
            >
              Browse this catalog
            </a>
            <a
              href="https://book.desirableproperties.org/"
              className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-medium text-slate-200 hover:border-slate-500"
            >
              Read Version 1.0
            </a>
          </div>
        </div>
      </section>

      {/* Foundation intro */}
      <section className="border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="max-w-3xl space-y-4 text-lg leading-relaxed text-slate-300">
            <p>
              The Desirable Properties are not implementation details. They describe the
              capabilities, protections, freedoms, governance mechanisms, and social outcomes we want
              the Meta-Layer to support.
            </p>
            <p>Version 1.0 is now the foundation for:</p>
            <ul className="list-disc space-y-2 pl-5">
              {FOUNDATION_USES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <blockquote className="mt-10 rounded-xl border border-violet-900/50 bg-violet-950/20 p-6 text-lg leading-relaxed text-slate-200">
            <p>
              <strong className="font-semibold text-white">
                The Desirable Properties define <em>what</em> humanity wants the Meta-Layer to
                enable. The substrate defines <em>how</em> those capabilities are implemented.
              </strong>
            </p>
            <p className="mt-4 text-slate-300">
              Getting the &ldquo;what&rdquo; right is the community&apos;s first and most important
              architectural decision.
            </p>
          </blockquote>
        </div>
      </section>

      {/* Three ways to contribute */}
      <section id="contribute" className="border-b border-slate-800 bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-3xl font-bold text-white">Four ways to contribute</h2>
          <p className="mt-3 max-w-3xl text-lg text-slate-400">
            Whether you have ten minutes or want to help shape Version 1.1 over several months,
            there&apos;s a place to contribute.
          </p>

          <ul className="mt-10 space-y-8">
            {CONTRIBUTE_CARDS.map((card, index) => (
              <li
                key={card.id}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-6 sm:p-8"
              >
                <div className="flex flex-wrap items-start gap-3">
                  <span className="text-2xl" aria-hidden>
                    {card.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-semibold text-white sm:text-2xl">
                        {index + 1}. {card.title}
                      </h3>
                      <span className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-0.5 text-xs font-medium text-slate-400">
                        {card.time}
                      </span>
                    </div>
                    <div className="mt-4 text-base leading-relaxed text-slate-300">{card.body}</div>
                    <div className="mt-6 flex flex-wrap gap-3">
                      {'secondaryCta' in card && card.secondaryCta ? (
                        <>
                          <PageLink
                            href={card.cta.href}
                            discussPatch={'discussPatch' in card.cta && card.cta.discussPatch}
                            className="inline-flex items-center rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-600"
                          >
                            {card.cta.label}
                          </PageLink>
                          <PageLink
                            href={card.secondaryCta.href}
                            className="inline-flex items-center rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-500"
                          >
                            {card.secondaryCta.label}
                          </PageLink>
                        </>
                      ) : (
                        <PageLink
                          href={card.cta.href}
                          discussPatch={'discussPatch' in card.cta && card.cta.discussPatch}
                          className="inline-flex items-center rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-600"
                        >
                          {card.cta.label}
                        </PageLink>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8">
            <div className="flex flex-wrap items-start gap-3">
              <span className="text-2xl" aria-hidden>
                🏛️
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-xl font-semibold text-white">The Desirable Properties Council</h3>
                <p className="mt-3 text-base leading-relaxed text-slate-300">
                  The council stewards the living book and the Desirable Properties over time. Its members are elected:
                  you can stand, nominate someone, and vote when an election is open.
                </p>
                <Link
                  href="/council"
                  className="mt-5 inline-flex items-center rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-500"
                >
                  About the council and its elections →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <BlueberriesWidget />

      {/* Workgroups, in brief – full roles, duties, and the join-vs-nominate breakdown live on the join page */}
      <section className="border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <Section title="Workgroups, in brief">
            <p>
              Workgroups helped take the Desirable Properties to Version 1.0. Now they{' '}
              <strong className="font-semibold text-white">
                review and shape proposals toward Version 1.1.
              </strong>{' '}
              It&apos;s a bounded commitment, not a permanent committee. Join for one property or
              several, and step back when you need to.
            </p>
            <p>
              Members read the book, discuss on any page, propose changes on the book or Gov Hub, and
              join workgroup discussion at their own pace. There is no obligation to attend every
              meeting. Each DP has up to three co-editors, and any two can approve a proposal. A
              coordinator runs the workgroup. Nobody owns a property or makes unilateral calls.
            </p>
            <p>
              <Link
                href="/workgroups#roles"
                className="font-medium text-cyan-300 hover:text-cyan-200"
              >
                See all workgroup roles →
              </Link>{' '}
              or{' '}
              <Link
                href={WORKGROUPS_LIST_HREF}
                className="font-medium text-cyan-300 hover:text-cyan-200"
              >
                browse DP workgroups →
              </Link>
            </p>
          </Section>
        </div>
      </section>

      {/* Badges */}
      <section id="badges" className="border-b border-slate-800 bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-3xl font-bold text-white">
            Recognition through Desirable Properties badges
          </h2>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-300">
            Every contribution helps build the foundation of the Meta-Layer, and meaningful
            participation will be recognized through the Desirable Properties Badge system.
          </p>

          <div className="mt-10">
            <DpBadgeCarousel
              items={localData.desirable_properties.map((dp) => ({
                id: dp.id,
                name: dp.name,
              }))}
              variant="embed"
            />
          </div>

          <ul className="mt-10 grid gap-5 sm:grid-cols-2">
            {BADGE_SECTIONS.map((section) => (
              <li
                key={section.title}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-6"
              >
                <h3 className="text-lg font-semibold text-white">{section.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{section.body}</p>
              </li>
            ))}
          </ul>

          <p className="mt-8 text-sm text-slate-400">
            Browse the full gallery and mint preview links on the{' '}
            <Link href="/badges" className="font-medium text-cyan-300 hover:text-cyan-200">
              badges page →
            </Link>
          </p>
        </div>
      </section>

      {/* Why participate */}
      <section className="border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <Section title="Why contribute?">
            <p>
              The Meta-Layer will shape how people collaborate, govern, coordinate, learn, create,
              and build trust online. Version 1.0 set out what that infrastructure should support.
              Version 1.1 is the chance to sharpen it before those capabilities become code.
            </p>
            <p>
              Your experience matters. Whether you are a technologist, researcher, designer,
              educator, policymaker, community organizer, entrepreneur, student, or simply someone
              with ideas about a better Internet, your perspective can help strengthen this shared
              foundation.
            </p>
            <p>
              Together, we can build infrastructure that better serves humanity.
            </p>
          </Section>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white">Ready to help?</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-300">
              Choose the level of participation that fits your schedule. No matter how you
              contribute, you&apos;ll be helping define the foundational requirements that guide the
              next generation of Internet infrastructure.
            </p>
          </div>

          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {FINAL_CTAS.map((item) => (
              <li
                key={item.title}
                className="flex h-full flex-col rounded-xl border border-slate-800 bg-slate-950/60 p-6"
              >
                <span className="text-2xl" aria-hidden>
                  {item.emoji}
                </span>
                <h3 className="mt-3 text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">
                  {item.description}
                </p>
                <PageLink
                  href={item.href}
                  discussPatch={'discussPatch' in item && item.discussPatch}
                  className={`mt-5 inline-flex w-fit items-center rounded-lg px-4 py-2.5 text-sm font-medium ${
                    item.primary
                      ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-950/40 hover:from-violet-500 hover:to-blue-500'
                      : 'border border-slate-700 text-slate-200 hover:border-slate-500'
                  }`}
                >
                  {item.title} →
                </PageLink>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href="/challenge"
              className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-medium text-slate-200 hover:border-slate-500"
            >
              View the Challenge timeline
            </Link>
            <a
              href={govhubUrl('/layers/the-metaweb/')}
              className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-medium text-slate-200 hover:border-slate-500"
            >
              Open Gov Hub
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
