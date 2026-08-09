import type { Metadata } from 'next';
import Link from 'next/link';
import ArchitectureFork from '@/components/pathways/ArchitectureFork';
import LayeredWebVision from '@/components/pathways/LayeredWebVision';
import PathwayHero from '@/components/pathways/PathwayHero';
import PathwayQuestionCard from '@/components/pathways/PathwayQuestionCard';
import PrincipleCard from '@/components/pathways/PrincipleCard';
import TrackedLink from '@/components/TrackedLink';
import TrackedAnchor from '@/components/TrackedAnchor';
import {
  AI_HUMAN_AGENCY_META,
  AI_HUMAN_AGENCY_PRINCIPLES,
  AI_HUMAN_AGENCY_QUESTIONS,
} from '@/data/pathways/ai-human-agency';
import { bookViewerHref, govhubUrl } from '@/lib/govhub';
import { WORKGROUPS_LIST_HREF } from '@/lib/routes';

const meta = AI_HUMAN_AGENCY_META;

export const metadata: Metadata = {
  title: meta.seoTitle,
  description: meta.seoDescription,
  openGraph: {
    title: meta.seoTitle,
    description: meta.seoDescription,
    url: `https://desirableproperties.org/pathways/${meta.slug}`,
    type: 'website',
  },
};

export default function AiHumanAgencyPathwayPage() {
  return (
    <main>
      <PathwayHero
        eyebrow="Desirable Properties Pathway"
        title={meta.title}
        subtitle={meta.subtitle}
        lead="AI is becoming ubiquitous. Human agency is not guaranteed."
        body={[
          'Artificial intelligence could give humanity unprecedented access to knowledge while also becoming the primary intermediary through which people experience the digital world. Meanwhile, beneath that interface, the Internet may fill with trillions of agents, models, services, devices, and computational environments.',
          'The question is whether humans will also be able to inhabit that emerging plurality.',
          'A human-centered layered Web would preserve Web resources as a shared substrate while allowing multiple independent computational environments to exist above and around them, with user-controlled identity and data, interoperable communities, shared human–AI contextual spaces, and protocols that allow those layers to discover, coexist, and interact.',
        ]}
        highlight="The question is not only how to make AI safe. What properties must this emerging digital environment possess to remain meaningfully human-centered?"
        ctas={[
          {
            href: '/perspectives/the-fork-in-the-web',
            label: 'Read “A Fork in the Web” →',
            eventName: 'pathway_fork_article_click',
          },
          {
            href: '/series/fork-in-the-web-workshops',
            label: 'Fork workshops →',
            variant: 'secondary',
          },
          {
            href: '#questions',
            label: 'Explore the questions ↓',
            variant: 'secondary',
          },
        ]}
      />

      <section
        aria-labelledby="principles-heading"
        className="border-b border-slate-800 bg-slate-900/30"
      >
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16">
          <h2 id="principles-heading" className="text-2xl font-bold text-white sm:text-3xl">
            Two principles for a pro-human digital world
          </h2>
          <div className="mt-8 space-y-5">
            {AI_HUMAN_AGENCY_PRINCIPLES.map((principle) => (
              <PrincipleCard key={principle.id} principle={principle} />
            ))}
          </div>
          <p className="mt-8 text-base font-medium leading-relaxed text-slate-200 sm:text-lg">
            Intellectual sovereignty is the right. Intellectual subsidiarity is the operating
            principle.
          </p>
          <p className="mt-4 rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm leading-relaxed text-slate-400">
            These are proposed concepts for discussion, not currently canonical Desirable
            Properties. Part of this pathway&apos;s purpose is to determine whether they are
            already adequately represented by existing DPs, should operate as cross-cutting
            principles, or reveal missing properties.
          </p>
        </div>
      </section>

      <LayeredWebVision />

      <section
        id="questions"
        aria-labelledby="questions-heading"
        className="border-b border-slate-800"
      >
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16">
          <h2 id="questions-heading" className="text-2xl font-bold text-white sm:text-3xl">
            Questions before properties
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
            Visitors coming from the AI conversation should encounter human questions first – and
            discover existing Desirable Properties through those questions.
          </p>
          <div className="mt-10 space-y-6">
            {AI_HUMAN_AGENCY_QUESTIONS.map((question, index) => (
              <PathwayQuestionCard
                key={question.id}
                question={question}
                index={index + 1}
                pathwaySlug={meta.slug}
              />
            ))}
          </div>
        </div>
      </section>

      <ArchitectureFork />

      <section
        aria-labelledby="inhabitant-heading"
        className="border-b border-slate-800 bg-slate-900/40"
      >
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16">
          <blockquote className="border-l-2 border-cyan-600/80 pl-5">
            <h2
              id="inhabitant-heading"
              className="text-2xl font-bold leading-snug text-white sm:text-3xl"
            >
              AI should be an inhabitant, not the landlord.
            </h2>
            <div className="mt-5 space-y-4 text-base leading-relaxed text-slate-300 sm:text-lg">
              <p>
                In a human-centered layered Web, AI can be ubiquitous. It can summarize, translate,
                recommend, coordinate, protect, discover, analyze, and act. But the architecture
                should also support persistent human communities, user-controlled identity and data,
                independent applications, public and private contextual environments, and direct
                human-to-human presence.
              </p>
              <p>
                AI should be able to move among these worlds without becoming the only world through
                which they can be reached.
              </p>
            </div>
          </blockquote>
          <p className="mt-8 text-sm leading-relaxed text-slate-500">
            Intellectual sovereignty is the right. Intellectual subsidiarity is the operating
            principle. A human-centered layered Web is an architectural approach capable of
            supporting both – it does not guarantee either.
          </p>
        </div>
      </section>

      <section
        aria-labelledby="missing-heading"
        className="border-b border-slate-800"
      >
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16">
          <h2 id="missing-heading" className="text-2xl font-bold text-white sm:text-3xl">
            What are we missing?
          </h2>
          <div className="mt-5 space-y-4 text-base leading-relaxed text-slate-300 sm:text-lg">
            <p>
              Imagine that AI becomes the primary way billions of people experience the Internet.
              What must remain true for that Internet to remain meaningfully human-centered?
            </p>
            <p>
              Consider agency, cognition, community, identity, memory, interoperability,
              governance, privacy, public space – or something the current Desirable Properties do
              not yet capture.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <TrackedAnchor
              href={bookViewerHref({ pageId: 'intro' })}
              eventName="pathway_discuss_click"
              eventPayload={{ pathway: meta.slug }}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg bg-cyan-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-cyan-600"
            >
              Discuss a Desirable Property →
            </TrackedAnchor>
            <TrackedAnchor
              href={govhubUrl('/submit/?layer=the-metaweb')}
              eventName="pathway_candidate_dp_click"
              eventPayload={{ pathway: meta.slug }}
              className="inline-flex items-center rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-400"
            >
              Propose a Missing Property →
            </TrackedAnchor>
            <TrackedLink
              href={meta.hermesHref}
              eventName="pathway_hermes_click"
              eventPayload={{ pathway: meta.slug }}
              className="inline-flex items-center rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-400"
            >
              Explore with Hermes →
            </TrackedLink>
          </div>
          <p className="mt-6 text-sm text-slate-500">
            <TrackedLink
              href={meta.hermesHref}
              eventName="pathway_hermes_click"
              eventPayload={{ pathway: meta.slug, surface: 'starter_copy' }}
              className="text-cyan-300 hover:text-cyan-200"
            >
              Explore these questions with Hermes
            </TrackedLink>
            <span className="text-slate-600"> – pathway-specific starter prompt included.</span>
          </p>
        </div>
      </section>

      <section aria-labelledby="doorway-heading">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16">
          <h2 id="doorway-heading" className="text-2xl font-bold text-white sm:text-3xl">
            AI is one doorway, not the boundary.
          </h2>
          <div className="mt-5 space-y-4 text-base leading-relaxed text-slate-300 sm:text-lg">
            <p>
              The machine world is becoming multilayered whether we intentionally design a
              human-centered layered Web or not. The Desirable Properties Challenge asks whether
              people, communities, institutions, and AI systems can inhabit that emerging complexity
              on terms that preserve human agency, plurality, and sovereignty.
            </p>
            <p>The goal is not to build the Internet around AI.</p>
            <p>
              It is to ensure that as AI becomes one of its most powerful inhabitants,{' '}
              <strong className="font-semibold text-white">
                the Internet still has room for many other worlds
              </strong>
              .
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <TrackedLink
              href="/#dps"
              eventName="pathway_all_dps_click"
              eventPayload={{ pathway: meta.slug }}
              className="inline-flex items-center rounded-lg bg-cyan-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-cyan-600"
            >
              Explore all Desirable Properties →
            </TrackedLink>
            <TrackedLink
              href={meta.hermesHref}
              eventName="pathway_hermes_click"
              eventPayload={{ pathway: meta.slug, surface: 'closing' }}
              className="inline-flex items-center rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-400"
            >
              Explore with Hermes →
            </TrackedLink>
            <TrackedAnchor
              href={govhubUrl('/submit/?layer=the-metaweb')}
              eventName="pathway_candidate_dp_click"
              eventPayload={{ pathway: meta.slug, surface: 'closing' }}
              className="inline-flex items-center rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-400"
            >
              Propose a Missing Property →
            </TrackedAnchor>
          </div>
          <p className="mt-6 text-sm text-slate-500">
            Prefer the Candidate DP process or not sure whether a concept belongs in an existing DP?{' '}
            Visit the{' '}
            <Link href="/workgroups/dp-discovery" className="text-cyan-300 hover:text-cyan-200">
              DP Discovery workgroup
            </Link>
            . Join a{' '}
            <Link href={WORKGROUPS_LIST_HREF} className="text-cyan-300 hover:text-cyan-200">
              workgroup
            </Link>{' '}
            to continue the conversation.
          </p>
        </div>
      </section>
    </main>
  );
}
