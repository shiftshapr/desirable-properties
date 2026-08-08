type Props = {
  title: string;
  subtitle: string;
  deck: string;
};

export default function PerspectiveHeader({ title, subtitle, deck }: Props) {
  return (
    <header className="border-b border-slate-800 pb-10">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">
        Perspective
      </p>
      <h1 className="mt-3 text-3xl font-bold leading-tight text-white sm:text-5xl">{title}</h1>
      <p className="mt-4 text-xl leading-snug text-slate-300 sm:text-2xl">{subtitle}</p>
      <p className="mt-4 text-base italic leading-relaxed text-slate-400 sm:text-lg">{deck}</p>
      <aside
        className="mt-8 rounded-lg border border-amber-900/40 bg-amber-950/20 px-4 py-3 text-sm leading-relaxed text-amber-100/90"
        role="note"
      >
        <strong className="font-semibold text-amber-50">Perspective:</strong> This essay is a
        contribution to the Desirable Properties Challenge. It presents an argument for discussion
        and does not represent a canonical Desirable Property or community consensus.
      </aside>
    </header>
  );
}
