import Link from 'next/link';
import BlueberriesWidget from '@/components/BlueberriesWidget';
import {
  DESIRABLE_PROPERTIES_BOOK_DISCUSSION_URL,
  DESIRABLE_PROPERTIES_BOOK_HOST,
  GOVHUB_DP_PATCHES_URL,
  govhubUrl,
} from '@/lib/govhub';
import { WORKGROUPS_LIST_HREF } from '@/lib/routes';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

function PageLink({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: ReactNode;
}) {
  if (href === '/agent' || href.startsWith('http://') || href.startsWith('https://')) {
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
  title: 'Participate – Desirable Properties Challenge',
  description:
    'Help build the foundation of the Meta-Layer. Integrate your ideas with the DP Community AI, review Desirable Properties, or join a workgroup.',
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
    id: 'integrate',
    emoji: '🚀',
    title: 'Integrate Your Existing Ideas',
    time: '≈10 minutes',
    body: (
      <>
        <p>
          Already have ideas? Perhaps you&apos;ve written a paper, drafted notes, built a project,
          published research, or simply have thoughts about what the future Internet should support.
        </p>
        <p className="mt-4">Use the <strong className="font-semibold text-white">DP Community AI</strong> to:</p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>compare your ideas with the current Desirable Properties</li>
          <li>identify where your ideas are already represented</li>
          <li>discover missing capabilities or gaps</li>
          <li>generate suggested patches or revisions</li>
          <li>prepare your ideas for community discussion</li>
        </ul>
        <p className="mt-4">
          Whether your ideas exist as documents, notes, presentations, or free-form thoughts, the AI
          can help integrate them into the community process.
        </p>
      </>
    ),
    cta: { href: '/agent', label: 'Use the DP Community AI →', primary: true },
  },
  {
    id: 'review',
    emoji: '📝',
    title: 'Review the Desirable Properties',
    time: '≈1–3 hours',
    body: (
      <>
        <p>Read the current draft and help improve it two ways:</p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            <strong className="font-semibold text-white">Discuss on the book</strong> — read chapters
            and comment with the community on{' '}
            <a
              href={DESIRABLE_PROPERTIES_BOOK_DISCUSSION_URL}
              className="text-cyan-300 hover:text-cyan-200"
              target="_blank"
              rel="noopener noreferrer"
            >
              {DESIRABLE_PROPERTIES_BOOK_HOST}
            </a>{' '}
            (comments are live now). Passage-level patching on the book is coming.
          </li>
          <li>
            <strong className="font-semibold text-white">Patch on Gov Hub</strong> — open a draft,
            select a passage, and submit a specific text revision on{' '}
            <a href={GOVHUB_DP_PATCHES_URL} className="text-cyan-300 hover:text-cyan-200">
              Gov Hub
            </a>
            .
          </li>
        </ul>
        <p className="mt-4">You can also identify missing concepts, suggest examples, challenge assumptions, and recommend new Desirable Properties. Every thoughtful review strengthens Version 1.0.</p>
      </>
    ),
    cta: {
      href: DESIRABLE_PROPERTIES_BOOK_DISCUSSION_URL,
      label: 'Read & discuss on the book →',
      primary: true,
    },
    secondaryCta: {
      href: GOVHUB_DP_PATCHES_URL,
      label: 'Patch a draft on Gov Hub',
    },
  },
  {
    id: 'workgroup',
    emoji: '🤝',
    title: 'Join a Workgroup',
    time: '≈2–10+ hours',
    body: (
      <>
        <p>Help synthesize community feedback into Version 1.0.</p>
        <p className="mt-4">
          Workgroups review comments, patches, proposals, and challenge submissions for one or more
          Desirable Properties. The DP Community AI assists by:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>clustering related submissions</li>
          <li>identifying recurring themes</li>
          <li>surfacing unresolved questions</li>
          <li>highlighting areas of agreement and disagreement</li>
          <li>generating synthesis drafts</li>
          <li>helping compare alternative proposals</li>
        </ul>
        <p className="mt-4">
          People make the decisions. AI helps organize the conversation. Together, workgroups discuss
          tradeoffs, build rough consensus, and prepare recommended revisions for the editorial
          process.
        </p>
        <p className="mt-4">
          This collaborative synthesis work will be most active during late August and early
          September as Version 1.0 takes shape. If you&apos;d like to help architect the future
          Meta-Layer, this is where you&apos;ll have the greatest impact.
        </p>
      </>
    ),
    cta: { href: WORKGROUPS_LIST_HREF, label: 'Join a Workgroup', primary: true },
    secondaryCta: {
      href: '/workgroups/join#join-vs-nominate',
      label: 'Nominate a Workgroup Coordinator',
    },
  },
] as const;

const BADGE_SECTIONS = [
  {
    title: 'One Badge for Every Desirable Property',
    body: (
      <>
        <p>Each Desirable Property has its own base badge. When you contribute to a specific DP, you earn that property&apos;s badge.</p>
        <p className="mt-3">
          Over time, contributors build a portfolio representing the parts of the Meta-Layer they
          helped shape.
        </p>
      </>
    ),
  },
  {
    title: 'Role Overlays',
    body: (
      <>
        <p>Badges can include overlays that recognize how you contributed. Examples include:</p>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>Member</li>
          <li>Workgroup Coordinator</li>
          <li>Co-Lead</li>
          <li>Reviewer</li>
          <li>Patch Contributor</li>
          <li>Steward</li>
        </ul>
        <p className="mt-3">
          A single badge may contain multiple overlays reflecting different forms of participation.
        </p>
      </>
    ),
  },
  {
    title: 'Contribution Evidence',
    body: (
      <>
        <p>Badges aren&apos;t just symbols. When minted, they can include links to the actual work that earned them, such as:</p>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>proposed patches</li>
          <li>workgroup documents</li>
          <li>meeting notes</li>
          <li>discussion threads</li>
          <li>pull requests</li>
          <li>implementation examples</li>
          <li>published articles</li>
          <li>supporting research</li>
          <li>other public contribution records</li>
        </ul>
        <p className="mt-3">
          This creates verifiable recognition connected directly to community contributions.
        </p>
      </>
    ),
  },
  {
    title: 'Extensible Metadata',
    body: (
      <>
        <p>Badge metadata can evolve to include:</p>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>Desirable Property number and title</li>
          <li>contributor roles and workgroup</li>
          <li>contribution summary and links</li>
          <li>version number and dates</li>
          <li>supporting resources and implementation evidence</li>
          <li>issuer information</li>
        </ul>
        <p className="mt-3">
          This creates a lasting record of participation that grows alongside the Meta-Layer
          ecosystem. Badges recognize contribution — they do <strong className="font-semibold text-white">not</strong> confer ownership, authority, or governance rights.
        </p>
      </>
    ),
  },
];

const FINAL_CTAS = [
  {
    emoji: '🚀',
    title: 'Use the DP Community AI',
    description: 'Integrate your ideas in about 10 minutes.',
    href: '/agent',
    primary: true,
  },
  {
    emoji: '📝',
    title: 'Review the Desirable Properties',
    description: 'Read and discuss on the book (comments live). Patch drafts on Gov Hub.',
    href: DESIRABLE_PROPERTIES_BOOK_DISCUSSION_URL,
    primary: false,
  },
  {
    emoji: '🤝',
    title: 'Join a Workgroup',
    description: 'Help synthesize community feedback into Version 1.0.',
    href: WORKGROUPS_LIST_HREF,
    primary: false,
  },
  {
    emoji: '🌟',
    title: 'Nominate a Workgroup Coordinator',
    description: 'Help coordinate one of the collaborative synthesis teams.',
    href: '/workgroups/join#join-vs-nominate',
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
          <p className="mt-6 text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
            Desirable Properties Challenge
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight text-white sm:text-5xl">
            Help Build the Foundation of the Meta-Layer
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-300">
            The Desirable Properties define what the Meta-Layer should make possible for humanity.
            Together, we&apos;re refining these properties into{' '}
            <strong className="font-semibold text-white">Version 1.0</strong> — a clear,
            community-developed foundation that will guide the design and implementation of the
            Meta-Layer substrate.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#contribute"
              className="rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-violet-950/40 hover:from-violet-500 hover:to-blue-500"
            >
              Three ways to contribute →
            </a>
            <Link
              href="/about"
              className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-medium text-slate-200 hover:border-slate-500"
            >
              New here? Read About
            </Link>
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
            <p>Version 1.0 will become the foundation for:</p>
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
          <h2 className="text-3xl font-bold text-white">Three Ways to Contribute</h2>
          <p className="mt-3 max-w-3xl text-lg text-slate-400">
            Whether you have ten minutes or want to help shape Version 1.0 over several weeks,
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
                            className="inline-flex items-center rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-600"
                          >
                            {card.cta.label}
                          </PageLink>
                          <Link
                            href={card.secondaryCta.href}
                            className="inline-flex items-center rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-500"
                          >
                            {card.secondaryCta.label}
                          </Link>
                        </>
                      ) : (
                        <PageLink
                          href={card.cta.href}
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
        </div>
      </section>

      <BlueberriesWidget />

      {/* Workgroups, in brief — full roles, duties, and the join-vs-nominate breakdown live on the join page */}
      <section className="border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <Section title="Workgroups, in Brief">
            <p>
              Workgroups exist for one purpose:{' '}
              <strong className="font-semibold text-white">
                to help develop and refine the Desirable Properties into Version 1.0.
              </strong>{' '}
              It&apos;s a bounded commitment, not a permanent committee — after Version 1.0
              publishes, participants decide whether and how they&apos;d like to keep contributing.
            </p>
            <p>
              Members read drafts, discuss on the book, patch on Gov Hub, and join workgroup
              discussion at their own pace — no obligation to attend every meeting. Coordinators
              and Co-Leads facilitate; they don&apos;t own a property or make unilateral calls.
            </p>
            <p>
              <Link
                href="/workgroups/join#roles"
                className="font-medium text-cyan-300 hover:text-cyan-200"
              >
                See all workgroup roles →
              </Link>{' '}
              or{' '}
              <Link
                href={WORKGROUPS_LIST_HREF}
                className="font-medium text-cyan-300 hover:text-cyan-200"
              >
                browse the 23 workgroups →
              </Link>
            </p>
          </Section>
        </div>
      </section>

      {/* Badges */}
      <section id="badges" className="border-b border-slate-800 bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-3xl font-bold text-white">
            Recognition Through Desirable Properties Badges
          </h2>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-300">
            Every contribution helps build the foundation of the Meta-Layer, and meaningful
            participation will be recognized through the Desirable Properties Badge system.
          </p>

          <ul className="mt-10 grid gap-5 sm:grid-cols-2">
            {BADGE_SECTIONS.map((section) => (
              <li
                key={section.title}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-6"
              >
                <h3 className="text-lg font-semibold text-white">{section.title}</h3>
                <div className="mt-3 text-sm leading-relaxed text-slate-400">{section.body}</div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Why participate */}
      <section className="border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <Section title="Why Participate?">
            <p>
              The Meta-Layer will shape how people collaborate, govern, coordinate, learn, create,
              and build trust online. The Desirable Properties are our opportunity to define the
              capabilities that infrastructure should support before those capabilities become code.
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
            <h2 className="text-3xl font-bold text-white">Ready to Help?</h2>
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
