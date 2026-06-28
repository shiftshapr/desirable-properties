const SATPLICATION_VIEWER_URL = 'https://app.metawebbook.com/ml_2.htm';

export default function SatplicationEmbed() {
  return (
    <section className="mt-10 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/80 px-4 py-3 sm:px-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-400">
            BRC333 Satplication
          </p>
          <p className="mt-1 text-sm text-slate-300">
            <code className="text-cyan-300">meta-layer-call-for-input</code> — browse inscribed
            articles, PCI threads, and submissions
          </p>
        </div>
        <a
          href={SATPLICATION_VIEWER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-cyan-300 hover:text-cyan-200"
        >
          Open full screen →
        </a>
      </div>
      <div className="relative bg-white">
        <iframe
          title="Meta-Layer Call for Input satplication"
          src={SATPLICATION_VIEWER_URL}
          className="block h-[min(78vh,900px)] w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </section>
  );
}
