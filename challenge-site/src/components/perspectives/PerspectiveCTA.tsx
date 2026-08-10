import TrackedLink from '@/components/TrackedLink';
import TrackedAnchor from '@/components/TrackedAnchor';
import DiscussPatchLink from '@/components/DiscussPatchLink';
import { perspectiveDiscussHref } from '@/lib/canopi-embed';
import { bookDiscussHref, govhubUrl } from '@/lib/govhub';

type Props = {
  perspectiveSlug: string;
};

export default function PerspectiveCTA({ perspectiveSlug }: Props) {
  return (
    <section
      aria-labelledby="perspective-cta-heading"
      className="mt-16 border-t border-slate-800 pt-12"
    >
      <h2 id="perspective-cta-heading" className="text-2xl font-bold text-white sm:text-3xl">
        What properties would make this architecture human-centered?
      </h2>
      <div className="mt-5 space-y-4 text-base leading-relaxed text-slate-300 sm:text-lg">
        <p>
          <em>A Fork in the Web</em> presents two possible trajectories. In one, the machine
          Internet becomes enormously multilayered while humans experience most of it through AI
          mediation. In the other, people, communities, institutions, applications, and AI agents
          can inhabit interoperable contextual spaces around shared Web resources.
        </p>
        <p>
          The Desirable Properties Challenge asks what must be true for the second path to remain
          open.
        </p>
        <p>
          Are intellectual sovereignty and intellectual subsidiarity adequately represented? Should
          freedom from mandatory AI mediation be explicit? What properties are required for
          user-controlled identity, interoperable communities, persistent human context, and
          coexistence among independent layers?
        </p>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <TrackedLink
          href="/pathways/ai-human-agency"
          eventName="article_pathway_click"
          eventPayload={{ perspective: perspectiveSlug }}
          className="inline-flex items-center rounded-lg bg-cyan-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-cyan-600"
        >
          Explore AI &amp; Human Agency →
        </TrackedLink>
        <TrackedLink
          href={perspectiveDiscussHref(`/perspectives/${perspectiveSlug}`)}
          eventName="article_discuss_click"
          eventPayload={{ perspective: perspectiveSlug, surface: 'perspective_embed' }}
          className="inline-flex items-center rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-400"
        >
          Discuss this essay →
        </TrackedLink>
        <DiscussPatchLink
          href={bookDiscussHref()}
          className="inline-flex items-center rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-400"
        >
          Discuss the Desirable Properties →
        </DiscussPatchLink>
        <TrackedAnchor
          href={govhubUrl('/submit/?layer=the-metaweb')}
          eventName="article_candidate_dp_click"
          eventPayload={{ perspective: perspectiveSlug }}
          className="inline-flex items-center rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-400"
        >
          Propose a Missing Property →
        </TrackedAnchor>
      </div>
    </section>
  );
}
