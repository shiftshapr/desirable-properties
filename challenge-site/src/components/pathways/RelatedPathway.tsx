import TrackedLink from '@/components/TrackedLink';

type Props = {
  pathwayHref?: string;
  pathwayTitle?: string;
  blurb?: string;
  dpId?: string;
};

export default function RelatedPathway({
  pathwayHref = '/pathways/ai-human-agency',
  pathwayTitle = 'AI & Human Agency',
  blurb = 'Explore how this property connects to intellectual sovereignty, intellectual subsidiarity, human presence, and the possibility of increasingly AI-mediated access to the Web.',
  dpId,
}: Props) {
  return (
    <aside
      aria-labelledby="related-pathway-heading"
      className="mt-10 rounded-xl border border-violet-900/40 bg-gradient-to-r from-violet-950/30 to-slate-900/60 p-5 sm:p-6"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300/90">
        Related Pathway
      </p>
      <h2 id="related-pathway-heading" className="mt-2 text-xl font-semibold text-white">
        {pathwayTitle}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-400 sm:text-base">{blurb}</p>
      <TrackedLink
        href={pathwayHref}
        eventName="dp_related_pathway_click"
        eventPayload={{ dp: dpId || null, pathway: pathwayHref }}
        className="mt-4 inline-flex text-sm font-medium text-cyan-300 hover:text-cyan-200"
      >
        Explore the pathway →
      </TrackedLink>
    </aside>
  );
}
