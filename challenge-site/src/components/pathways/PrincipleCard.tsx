import type { PathwayPrinciple } from '@/lib/pathways';

type Props = {
  principle: PathwayPrinciple;
};

export default function PrincipleCard({ principle }: Props) {
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6">
      <h3 className="text-xl font-semibold text-white">{principle.title}</h3>
      <p className="mt-3 text-base font-medium leading-relaxed text-cyan-100/95">
        {principle.statement}
      </p>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-400 sm:text-base">
        {principle.body.map((paragraph) => (
          <p key={paragraph.slice(0, 40)}>{paragraph}</p>
        ))}
      </div>
    </article>
  );
}
