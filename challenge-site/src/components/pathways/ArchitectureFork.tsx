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
            <div
              className="mt-5 space-y-1 font-mono text-sm leading-relaxed text-cyan-200/90"
              aria-hidden="true"
            >
              <p>Human</p>
              <p className="text-slate-500">↓</p>
              <p>AI Interface</p>
              <p className="text-slate-500">↓</p>
              <p className="text-slate-300">
                Agents / Models / Services / Web / Databases / Devices
              </p>
            </div>
            <p className="sr-only">
              Human, then AI interface, then agents, models, services, Web, databases, and devices.
            </p>
            <p className="mt-5 text-sm leading-relaxed text-slate-400">
              The machine world becomes radically complex and multilayered, while the human
              primarily experiences it through one personalized intermediary.
            </p>
            <ul className="mt-5 list-disc space-y-2 pl-5 text-sm text-slate-300">
              <li>AI-selected context</li>
              <li>Personalized interpretation</li>
              <li>Machine-to-machine interoperability</li>
              <li>Ephemeral responses</li>
              <li>Convenience</li>
              <li>Reduced need to enter shared digital environments directly</li>
            </ul>
          </article>

          <article className="rounded-xl border border-cyan-900/40 bg-cyan-950/20 p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-white">Human-Centered Layered Web</h3>
            <div className="mt-5 space-y-3 font-mono text-sm leading-relaxed" aria-hidden="true">
              <p className="text-slate-400">Web resources / digital objects</p>
              <p className="text-slate-500">↑ above and around ↑</p>
              <p className="text-cyan-200/90">
                Communities · AI environments · Knowledge systems · Applications · Institutions ·
                Individuals
              </p>
              <p className="text-slate-300">portable identity + data</p>
              <p className="text-slate-400">
                open discovery / coexistence / interaction protocols
              </p>
            </div>
            <p className="sr-only">
              Web resources and digital objects underneath; above and around them, communities, AI
              environments, knowledge systems, applications, institutions, and individuals; shared
              portable identity and data; connected by open discovery, coexistence, and interaction
              protocols.
            </p>
            <p className="mt-5 text-sm leading-relaxed text-slate-400">
              The machine world remains highly intelligent and complex, but humans, communities,
              institutions, and AI systems can all maintain independent presence within a shared
              plural architecture.
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
