import TrackedLink from '@/components/TrackedLink';
import TrackedAnchor from '@/components/TrackedAnchor';
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
        What properties would keep this future human?
      </h2>
      <div className="mt-5 space-y-4 text-base leading-relaxed text-slate-300 sm:text-lg">
        <p>
          <em>The Fork in the Web</em> presents one possible architectural fork. The Desirable
          Properties Challenge is an open effort to determine what a human-centered layered Web
          should actually make possible.
        </p>
        <p>
          Are intellectual sovereignty and intellectual subsidiarity already captured by the
          current properties? Should freedom from mandatory AI mediation be explicit? What have we
          missed?
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
        <TrackedAnchor
          href={bookDiscussHref()}
          eventName="article_discuss_click"
          eventPayload={{ perspective: perspectiveSlug }}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-400"
        >
          Discuss the Desirable Properties →
        </TrackedAnchor>
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
