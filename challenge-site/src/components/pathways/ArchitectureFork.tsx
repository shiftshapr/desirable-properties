/**
 * Two architectural trajectories — text-first, with a simple diagram that has
 * accessible text equivalents. Stacks on mobile.
 */
export default function ArchitectureFork() {
  return (
    <section aria-labelledby="architecture-fork-heading" className="border-b border-slate-800">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <h2 id="architecture-fork-heading" className="text-2xl font-bold text-white sm:text-3xl">
          Two possible trajectories
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-400 sm:text-lg">
          These are architectural tendencies that can coexist. Design choices influence which
          becomes dominant—not a deterministic binary, and not a moral cartoon.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <article className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-white">AI-Mediated Awareness</h3>
            <p className="mt-4 font-mono text-sm leading-relaxed text-cyan-200/90">
              Human → AI → Web / Services / Agents / Knowledge
            </p>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              AI becomes the primary aperture through which the individual experiences an
              increasingly complex digital world.
            </p>
            <ul className="mt-5 list-disc space-y-2 pl-5 text-sm text-slate-300">
              <li>Personalized mediation</li>
              <li>Machine-generated context</li>
              <li>AI-to-AI interoperability</li>
              <li>Ephemeral interpretation</li>
              <li>Reduced direct contact with shared digital environments</li>
            </ul>
          </article>

          <article className="rounded-xl border border-cyan-900/40 bg-cyan-950/20 p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-white">Human-Centered Layered Web</h3>
            <p className="mt-4 font-mono text-sm leading-relaxed text-cyan-200/90">
              Humans + Communities + AI + Applications
            </p>
            <p className="mt-2 font-mono text-sm leading-relaxed text-slate-300">
              interacting through plural, persistent, interoperable layers
            </p>
            <p className="mt-2 font-mono text-sm leading-relaxed text-slate-400">
              in relation to Web resources and other digital objects
            </p>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              AI remains ubiquitous, but people, communities, institutions, and computational
              environments can also establish independent presence and context.
            </p>
            <ul className="mt-5 list-disc space-y-2 pl-5 text-sm text-slate-300">
              <li>Independent human and community presence</li>
              <li>Shared, contestable context</li>
              <li>Interoperability among participants—not only agents</li>
              <li>Persistent civic and communal memory</li>
              <li>AI as one powerful participant among many</li>
            </ul>
          </article>
        </div>

        <p className="mt-8 max-w-3xl text-sm leading-relaxed text-slate-500">
          Ubiquitous AI mediation alone does not guarantee human-centered architecture. The
          argument is about which relationships the environment makes possible—not about casting
          either trajectory as inevitable destiny.
        </p>
      </div>
    </section>
  );
}
