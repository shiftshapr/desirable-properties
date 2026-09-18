import Image from 'next/image';
import Link from 'next/link';
import DiscussPatchLink from '@/components/DiscussPatchLink';
import localData from '@/data/desirable-properties.json';
import { challengeMeta } from '@/lib/challengeTimeline';
import {
  bookDiscussHref,
  DESIRABLE_PROPERTIES_BOOK_HOST,
  DESIRABLE_PROPERTIES_BOOK_TITLE,
  GOVHUB_DP_PATCHES_URL,
} from '@/lib/govhub';
import { CHALLENGE_KEY_DATES } from '@/lib/dp-welcome-content.generated';
import { DP_WORKGROUP_SLUGS } from '@/lib/dp-workgroup-slugs';
import { WORKGROUPS_LIST_HREF } from '@/lib/routes';
import { workgroupPrimaryHref } from '@/lib/workgroup-links';
import { WORKGROUP_TARGET_MEMBER_COUNT } from '@/lib/workgroup-roster-nudge';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Start Here – Desirable Properties Challenge',
  description:
    'Two ways to contribute: review and revise Desirable Properties on the book, or join a workgroup toward Version 1.0 on November 13, 2026.',
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
      <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold text-white sm:text-3xl">
        {title}
      </h2>
      <div className="prose-section mt-5 space-y-4 text-lg leading-relaxed text-slate-300">
        {children}
      </div>
    </section>
  );
}

const ORIGIN_STEPS = [
  {
    label: 'Book',
    detail: 'A new way to see the Web',
    href: 'https://app.metawebbook.com/ml_2.htm',
    external: true,
  },
  {
    label: 'Kickoff',
    detail: 'A shared design question',
    href: '/kickoff',
    external: false,
  },
  {
    label: 'DPs',
    detail: 'Public design criteria',
    href: '/#dps',
    external: false,
  },
  {
    label: 'Requirements',
    detail: 'Testable obligations',
    href: '/events/community-review#design-loop',
    external: false,
  },
  {
    label: 'Substrate',
    detail: 'Shared infrastructure',
    href: 'https://themetalayer.org',
    external: true,
  },
] as const;

const BUILD_PATH = [
  {
    step: 'DP',
    question: 'What must be true?',
    body: 'Community-defined criteria that any implementation should satisfy.',
  },
  {
    step: 'ML-REQ',
    question: 'What must systems satisfy?',
    body: 'Testable requirements derived from accepted properties.',
  },
  {
    step: 'ML-ADR',
    question: 'What do we choose, and why?',
    body: 'Documented architecture decisions with explicit rationale.',
  },
  {
    step: 'Overweb',
    question: 'What shared layer makes it usable?',
    body: 'Substrate for overlays, smart tags, presence, filters, and governance.',
  },
] as const;

function dpHref(id: string) {
  return `/dp/${id.toLowerCase()}`;
}

export default function StartHerePage() {
  const categories = localData.meta.categories;
  const dpsByCategory = categories.map((category) => ({
    category,
    dps: localData.desirable_properties.filter((dp) => dp.category === category),
  }));
  const reviewOpens = CHALLENGE_KEY_DATES.bookLaunch.label;
  const v1Target = CHALLENGE_KEY_DATES.v1Release.label;

  return (
    <main className="border-b border-slate-800">
      <section className="border-b border-slate-800 bg-gradient-to-b from-slate-900/80 to-slate-950">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <Link href="/" className="text-sm text-cyan-300 hover:text-cyan-200">
            ← Home
          </Link>
          <p className="mt-6 text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
            Meta-Layer Initiative · Start here
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-tight text-white sm:text-5xl">
            Help define a trustworthy layer above the Web
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-300">
            Desirable Properties are public design criteria for the Meta-Layer: what must stay true
            across implementations. The Community Review Draft is published. The next milestone is{' '}
            <strong className="font-semibold text-white">Version 1.0 on {v1Target}</strong>.
          </p>
          <p className="mt-4 max-w-3xl text-base text-slate-400">
            Current draft: Version {challengeMeta.current_draft_version}. The workgroup{' '}
            <strong className="font-semibold text-white">Collaborate</strong> page is where groups
            take a DP to Version 1.0. Commenting on the book is the lighter path.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#tracks"
              className="rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-violet-950/40 hover:from-violet-500 hover:to-blue-500"
            >
              Choose a track →
            </a>
            <a
              href="#orientation"
              className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-medium text-slate-200 hover:border-slate-500"
            >
              Why this exists
            </a>
          </div>
        </div>
      </section>

      <section id="tracks" className="scroll-mt-20 border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-3xl font-bold text-white">Two ways to contribute</h2>
          <p className="mt-3 max-w-3xl text-lg text-slate-400">
            You do not need to do both. If you will stay with a property through November, the
            Collaborate page is the workgroup home.
          </p>
          <ul className="mt-10 grid gap-5">
            <li className="rounded-2xl border-2 border-violet-400 bg-gradient-to-br from-violet-950/80 via-slate-950 to-slate-950 p-6 shadow-lg shadow-violet-950/50 sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-wide text-violet-200">
                Primary for Version 1.0 · Collaborate page
              </p>
              <h3 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
                Join a workgroup Collaborate page
              </h3>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-200 sm:text-lg">
                Each DP has a Collaborate page. That is the workgroup workspace, not a side tab.
                Use <strong className="font-semibold text-white">Astra</strong> to review editorial
                synthesis, <strong className="font-semibold text-white">Edit</strong> to propose
                chapter changes, and <strong className="font-semibold text-white">Canopi</strong> to
                post, comment, review, and like. We want at least {WORKGROUP_TARGET_MEMBER_COUNT}{' '}
                people per workgroup. If a group is smaller, invite others.
              </p>
              <p className="mt-4 max-w-3xl rounded-lg border border-amber-800/50 bg-amber-950/30 px-4 py-3 text-sm leading-relaxed text-amber-100">
                Sign in when you open Collaborate. Joining the workgroup, Astra, Edit, and Canopi
                (post, comment, review, like) need a session. Use Sign In in the header, then return
                to the Collaborate page.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={WORKGROUPS_LIST_HREF}
                  className="inline-flex rounded-lg bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-500"
                >
                  Browse Collaborate pages →
                </Link>
                <a
                  href="#pick-a-dp"
                  className="inline-flex rounded-lg border border-violet-400/70 px-5 py-3 text-sm font-medium text-violet-100 hover:border-violet-300"
                >
                  Open Collaborate for one DP
                </a>
              </div>
            </li>
            <li className="flex h-full flex-col rounded-xl border border-slate-700 bg-slate-900/40 p-6 sm:p-7">
              <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">
                Also useful · Review and revise
              </p>
              <h3 className="mt-3 text-xl font-bold text-white">Comment on the book</h3>
              <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-300">
                Prefer 30–90 minutes on a chapter without joining a group? Discuss and suggest
                wording on {DESIRABLE_PROPERTIES_BOOK_HOST}. Passage-level patches can also go to
                Gov Hub.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <DiscussPatchLink
                  href={bookDiscussHref()}
                  className="inline-flex rounded-lg border border-cyan-700 bg-cyan-950/40 px-5 py-2.5 text-sm font-medium text-cyan-100 hover:border-cyan-500"
                >
                  Discuss &amp; Patch a chapter →
                </DiscussPatchLink>
                <a
                  href={GOVHUB_DP_PATCHES_URL}
                  className="inline-flex rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-500"
                >
                  Patch on Gov Hub
                </a>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <section id="pick-a-dp" className="scroll-mt-20 border-b border-slate-800 bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-3xl font-bold text-white">Or start from a property</h2>
          <p className="mt-3 max-w-3xl text-lg text-slate-400">
            Open the Collaborate page for that DP (workgroup workspace). Comment on the chapter if
            you only want to review.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {localData.desirable_properties.map((dp) => {
              const slug = DP_WORKGROUP_SLUGS[dp.id];
              return (
                <li
                  key={dp.id}
                  className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-3"
                >
                  <Link
                    href={dpHref(dp.id)}
                    className="font-medium text-white hover:text-cyan-200"
                  >
                    {dp.id} {dp.name}
                  </Link>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {slug ? (
                      <Link
                        href={workgroupPrimaryHref(slug)}
                        className="inline-flex rounded-md bg-violet-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-violet-600"
                      >
                        Collaborate
                      </Link>
                    ) : null}
                    <DiscussPatchLink
                      href={bookDiscussHref({ dpId: dp.id })}
                      className="text-sm text-cyan-300 hover:text-cyan-200"
                    >
                      Comment on chapter
                    </DiscussPatchLink>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <nav
          id="orientation"
          className="scroll-mt-20 rounded-xl border border-slate-800 bg-slate-900/40 p-5 text-sm"
        >
          <p className="font-medium text-slate-200">Why this exists</p>
          <p className="mt-2 text-slate-400">
            Orientation from the public briefing. Skip this if you already picked a track.
          </p>
          <ul className="mt-3 grid gap-2 text-cyan-300 sm:grid-cols-2 lg:grid-cols-3">
            <li>
              <a href="#core-shift" className="hover:text-cyan-200">
                The page is not the whole room
              </a>
            </li>
            <li>
              <a href="#origin" className="hover:text-cyan-200">
                From vision to initiative
              </a>
            </li>
            <li>
              <a href="#question" className="hover:text-cyan-200">
                The design question
              </a>
            </li>
            <li>
              <a href="#what-is-dp" className="hover:text-cyan-200">
                What is a Desirable Property?
              </a>
            </li>
            <li>
              <a href="#build-path" className="hover:text-cyan-200">
                From property to infrastructure
              </a>
            </li>
            <li>
              <a href="#landscape" className="hover:text-cyan-200">
                The six families
              </a>
            </li>
            <li>
              <a href="#timeline" className="hover:text-cyan-200">
                Timeline to Version 1.0
              </a>
            </li>
            <li>
              <a href="#built-in-public" className="hover:text-cyan-200">
                Built in public
              </a>
            </li>
          </ul>
        </nav>

        <div className="mt-14 space-y-16 lg:space-y-20">
          <Section id="core-shift" title="The page is not the whole room">
            <p>
              Today&apos;s Web often feels like a flat surface of pages, feeds, apps, and platforms.
              The Metaweb asks us to see the Web as a multi-layered environment where people,
              knowledge, interactions, and governance can have{' '}
              <strong className="font-semibold text-white">presence above the webpage</strong>.
            </p>
            <p>
              The Meta-Layer is a community-governed coordination layer above today&apos;s Web: a
              shared digital atmosphere for context, trust, memory, and collective intelligence
              without replacing the content you already use.
            </p>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {['Context', 'Presence', 'Trust', 'Governance'].map((pillar) => (
                <li
                  key={pillar}
                  className="rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-3 text-center font-medium text-white"
                >
                  {pillar}
                </li>
              ))}
            </ul>
            <p>
              Read the full framing on <Link href="/about">About</Link> or in the opening chapter of{' '}
              <DiscussPatchLink
                href={bookDiscussHref()}
                className="text-cyan-300 hover:text-cyan-200"
              >
                {DESIRABLE_PROPERTIES_BOOK_TITLE}
              </DiscussPatchLink>
              .
            </p>
          </Section>

          <Section id="origin" title="From vision to initiative">
            <p>
              <em>The Metaweb: The Next Level of the Internet</em> introduced the layered Web as a
              safe, AI-aware environment for privacy, accountability, collaboration, and collective
              intelligence. That vision catalyzed a public build process: if there is to be a layer
              above the Web, how should it be designed, governed, and evaluated?
            </p>
            <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {ORIGIN_STEPS.map((item, index) => (
                <li
                  key={item.label}
                  className="relative rounded-xl border border-slate-800 bg-slate-900/40 p-4"
                >
                  <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Step {index + 1}
                  </span>
                  <p className="mt-2 font-semibold text-white">{item.label}</p>
                  <p className="mt-1 text-sm text-slate-400">{item.detail}</p>
                  {item.external ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-block text-sm text-cyan-300 hover:text-cyan-200"
                    >
                      Learn more →
                    </a>
                  ) : (
                    <Link
                      href={item.href}
                      className="mt-3 inline-block text-sm text-cyan-300 hover:text-cyan-200"
                    >
                      Learn more →
                    </Link>
                  )}
                </li>
              ))}
            </ol>
            <p>
              The September 2024 kickoff with Vint Cerf named an essay on desirable properties as
              the first milestone. See the{' '}
              <Link href="/kickoff" className="text-cyan-300 hover:text-cyan-200">
                kickoff summary
              </Link>{' '}
              and the full{' '}
              <Link href="/challenge" className="text-cyan-300 hover:text-cyan-200">
                challenge timeline
              </Link>
              .
            </p>
          </Section>

          <Section id="question" title="What should be true of a trustworthy layer above the Web?">
            <p>
              Before requirements, technical specs, or architecture decisions, the community needs
              shared criteria. What makes this layer desirable? What harms must it avoid? What
              capacities must it enable?
            </p>
            <p>
              That question launches the Desirable Properties Challenge: refine, debate, test, and
              improve living drafts on the path toward Version 1.0 and substrate work.
            </p>
          </Section>

          <Section id="what-is-dp" title="What is a Desirable Property?">
            <p>
              A Desirable Property (DP) is a{' '}
              <strong className="font-semibold text-white">public design criterion</strong> for the
              layer above the Web. It describes a condition the Meta-Layer should satisfy: whatever
              we build, this property should be visible, reviewable, and operationalizable.
            </p>
            <p>A DP is not one implementation. The same property can be tested across:</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {[
                'An overlay app',
                'Browser integration',
                'An SDK or library',
                'A community tool',
              ].map((example) => (
                <li
                  key={example}
                  className="rounded-lg border border-slate-800 px-4 py-2 text-base text-slate-200"
                >
                  {example}
                </li>
              ))}
            </ul>
            <p>
              DPs describe outcomes and conditions (the &ldquo;what&rdquo; humanity wants). They are
              not RFCs or product requirements. Multiple implementations can coexist while staying
              aligned on shared outcomes. See{' '}
              <Link href="/faq#start-here" className="text-cyan-300 hover:text-cyan-200">
                FAQ: Start here
              </Link>
              .
            </p>
          </Section>

          <Section id="build-path" title="From property to shared infrastructure">
            <p>
              Desirable Properties guide requirements. Requirements shape architecture decisions.
              Architecture decisions shape the Overweb substrate. The substrate then supports
              overlay apps, smart tags, presence, filters, meta-communities, and governance.
            </p>
            <div className="not-prose my-8 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60">
              <Image
                src="/images/dp-challenge-arc.jpg"
                alt="Desirable Properties Challenge leads to Requirements, Architecture Decision Records, and building the Overweb"
                width={1200}
                height={675}
                className="h-auto w-full"
              />
            </div>
            <ol className="grid gap-4 md:grid-cols-2">
              {BUILD_PATH.map((item) => (
                <li
                  key={item.step}
                  className="rounded-xl border border-violet-900/40 bg-violet-950/15 p-5"
                >
                  <p className="text-sm font-medium uppercase tracking-wider text-violet-300">
                    {item.step}
                  </p>
                  <p className="mt-2 font-semibold text-white">{item.question}</p>
                  <p className="mt-2 text-base text-slate-300">{item.body}</p>
                </li>
              ))}
            </ol>
          </Section>

          <Section id="landscape" title="Six families of Desirable Properties">
            <p>
              The Community Review Draft organizes {localData.meta.total_properties} canonical DPs
              into six families. You do not need to read every property. Pick one that matches your
              lens.
            </p>
            <div className="space-y-6">
              {dpsByCategory.map(({ category, dps }) => (
                <div key={category}>
                  <h3 className="text-lg font-semibold text-white">{category}</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {dps.map((dp) => dp.id).join(' · ')}
                  </p>
                </div>
              ))}
            </div>
            <p>
              <a href="#pick-a-dp" className="text-cyan-300 hover:text-cyan-200">
                Back to pick a property →
              </a>
            </p>
          </Section>

          <Section id="timeline" title="From community review to Version 1.0">
            <p>
              Public review is open. Workgroup synthesis now aims at Version 1.0, then candidate
              requirements, architecture decisions, and implementation evidence.
            </p>
            <ol className="space-y-4 border-l-2 border-slate-800 pl-6">
              <li>
                <p className="font-semibold text-white">{reviewOpens} · past</p>
                <p className="text-base text-slate-400">
                  Community Review Draft milestone.{' '}
                  <Link
                    href="/launch-briefing"
                    className="text-cyan-300 hover:text-cyan-200"
                  >
                    What shipped
                  </Link>
                </p>
              </li>
              <li>
                <p className="font-semibold text-white">Now through {v1Target}</p>
                <p className="text-base text-slate-400">
                  Book discussion, workgroup Astra and Edit work, Canopi conversation, and
                  recruitment to at least {WORKGROUP_TARGET_MEMBER_COUNT} people per workgroup
                </p>
              </li>
              <li>
                <p className="font-semibold text-white">{v1Target} · target</p>
                <p className="text-base text-slate-400">
                  Version 1.0 release target ({challengeMeta.v1_release_title}). Dates are targets,
                  not guaranteed ship dates.
                </p>
              </li>
            </ol>
            <p>
              <Link href="/challenge" className="text-cyan-300 hover:text-cyan-200">
                View the full challenge timeline →
              </Link>
            </p>
          </Section>

          <Section id="built-in-public" title="The Overweb will be built in public">
            <blockquote className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-6 text-lg text-slate-200">
              <p>
                <strong className="font-semibold text-white">
                  Choose one DP. Bring one improvement.
                </strong>
              </p>
              <p className="mt-3 text-slate-300">
                Comment on a chapter, or join a workgroup and help take it to Version 1.0 by{' '}
                {v1Target}.
              </p>
            </blockquote>
            <div className="flex flex-wrap gap-3">
              <Link
                href={WORKGROUPS_LIST_HREF}
                className="rounded-lg bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-500"
              >
                Open a Collaborate page
              </Link>
              <DiscussPatchLink
                href={bookDiscussHref()}
                className="rounded-lg border border-cyan-700 px-5 py-3 text-sm font-medium text-cyan-100 hover:border-cyan-500"
              >
                Review a chapter
              </DiscussPatchLink>
            </div>
          </Section>
        </div>
      </div>
    </main>
  );
}
