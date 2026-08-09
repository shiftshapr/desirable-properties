import { BRC333_BOOK_PREVIEW_URL, BRC333_BOOK_PROJECT } from '@/lib/brc333Links';

// Use book-preview.html directly — preview.html only JS-redirects and renders blank in iframes.
const SATPLICATION_VIEWER_URL = BRC333_BOOK_PREVIEW_URL;

const SAT_GRAPH_URL = `${BRC333_BOOK_PROJECT}/satplication-graph.html`;

export default function SatplicationEmbed() {
  return (
    <section className="mt-10 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/80 px-4 py-3 sm:px-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-400">
            BRC333 Satplication · work in progress
          </p>
          <p className="mt-1 text-sm text-slate-300">
            <code className="text-cyan-300">desirableproperties-book</code> – <em>The Layered Web</em>, served as a local preview while we wire up the
            chapter index.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <a
            href={SAT_GRAPH_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-slate-700 px-3 py-1 text-slate-200 hover:border-cyan-500 hover:text-cyan-200"
          >
            Sat-graph ↗
          </a>
          <a
            href={SATPLICATION_VIEWER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-300 hover:text-cyan-200"
          >
            Open full screen →
          </a>
        </div>
      </div>
      <div className="relative aspect-square w-full max-w-[min(100%,42rem)] bg-slate-950 sm:mx-auto">
        <iframe
          title="The Layered Web satplication"
          src={SATPLICATION_VIEWER_URL}
          className="absolute inset-0 h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </section>
  );
}
