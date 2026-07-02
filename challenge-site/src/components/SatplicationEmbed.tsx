// Canonical local preview of the Desirable Properties book reader
// (served from app.brc333.xyz). The `localSources` + `localFiles`
// query flags make the preview load sources-sat.json / config-sat.json
// from the same origin instead of the project's on-chain sources sat.
const SATPLICATION_VIEWER_URL =
  'https://app.brc333.xyz/projects/desirableproperties-book-ordinal/preview.html?localSources=1&localFiles=1';

const SAT_GRAPH_URL =
  'https://app.brc333.xyz/projects/desirableproperties-book-ordinal/satplication-graph.html';

export default function SatplicationEmbed() {
  return (
    <section className="mt-10 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/80 px-4 py-3 sm:px-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-400">
            BRC333 Satplication · work in progress
          </p>
          <p className="mt-1 text-sm text-slate-300">
            <code className="text-cyan-300">desirableproperties-book</code> – the inscribed
            Desirable Properties book, served as a local preview while we wire up the
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
      <div className="relative flex items-center justify-center bg-slate-950">
        <iframe
          title="Desirable Properties book satplication"
          src={SATPLICATION_VIEWER_URL}
          className="block h-[600px] w-[600px] border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </section>
  );
}
