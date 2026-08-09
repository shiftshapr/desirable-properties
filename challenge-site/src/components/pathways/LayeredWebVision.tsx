import Image from 'next/image';

const ARCHITECTURE_SRC =
  '/images/pathways/ai-human-agency/human-centered-layered-web.webp';
const ARCHITECTURE_ALT =
  'Diagram of a human-centered layered Web. Web resources form the underlying layer. Above them are multiple independent computational environments connected by open protocols. A user controls identity and data across environments, interoperable communities connect across layers, and people and AI agents share contextual spaces.';

const ELEMENTS: { label: string; title: string; body: string }[] = [
  {
    label: 'Shared substrate',
    title: 'Web resources underneath',
    body: 'Pages, documents, media, datasets, applications, and other digital objects remain common reference points.',
  },
  {
    label: 'Plural computation',
    title: 'Multiple independent computational environments',
    body: 'Different communities, networks, institutions, developers, and individuals can create environments around the same underlying resources.',
  },
  {
    label: 'Portable human agency',
    title: 'User-controlled identity and data',
    body: 'People should be able to move identity, permissions, relationships, and data among environments without being trapped inside one platform.',
  },
  {
    label: 'Shared contextual presence',
    title: 'People and AI agents sharing contextual space',
    body: 'AI participates with humans rather than becoming the mandatory interface through which humans encounter one another.',
  },
  {
    label: 'Interoperable communities',
    title: 'Communities rather than platform silos',
    body: 'Communities should be able to maintain their own norms and governance while still interacting across boundaries.',
  },
  {
    label: 'Layer interoperability',
    title: 'Protocols for discovery, coexistence, and interaction',
    body: 'Independent layers need ways to discover relevant environments, exchange context, declare capabilities, coexist around common resources, and interact without one layer controlling the rest.',
  },
];

/**
 * Pathway vision: architecture image as primary visual, with compact accessible
 * text for the six concepts (not a competing diagram or card dashboard).
 */
export default function LayeredWebVision() {
  return (
    <section
      aria-labelledby="architecture-vision-heading"
      className="border-b border-slate-800 bg-slate-900/20"
    >
      <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-16">
        <h2
          id="architecture-vision-heading"
          className="text-2xl font-bold text-white sm:text-3xl"
        >
          The architecture we are exploring
        </h2>
        <div className="mt-5 space-y-4 text-base leading-relaxed text-slate-300 sm:text-lg">
          <p>
            This pathway is not proposing a single platform, application, or AI system. It is
            exploring the properties of a digital architecture in which many independent
            environments can coexist around shared Web resources.
          </p>
          <p>
            The alternative to ubiquitous AI mediation is not less AI. It is a richer digital
            architecture in which humans, communities, institutions, applications, and AI systems
            can all maintain independent presence.
          </p>
          <p>
            Web resources remain underneath as shared reference points. Above and around them,
            multiple independent computational environments can coexist. Users can carry identity
            and data among those environments. People and AI agents can share contextual spaces.
            Communities can interact across boundaries without becoming platform silos. Open
            protocols can allow different layers to discover, coexist, exchange context, and
            interact.
          </p>
        </div>

        <figure className="mt-10">
          <Image
            src={ARCHITECTURE_SRC}
            alt={ARCHITECTURE_ALT}
            width={1600}
            height={900}
            className="h-auto w-full rounded-lg border border-slate-800"
            sizes="(max-width: 896px) 100vw, 896px"
            priority={false}
          />
          <figcaption className="mt-3 text-sm leading-relaxed text-slate-400 sm:text-base">
            <strong className="font-semibold text-slate-200">
              A human-centered layered Web:
            </strong>{' '}
            Web resources remain underneath while independent computational environments, people,
            communities, and AI can coexist through user-controlled identity, interoperable
            context, and open protocols.
          </figcaption>
        </figure>

        <p className="mt-8 text-base font-medium leading-relaxed text-slate-100 sm:text-lg">
          The goal is not one new layer above the Web. It is a space in which many independent
          layers can exist.
        </p>

        <ul className="mt-8 divide-y divide-slate-800 border-y border-slate-800">
          {ELEMENTS.map((el) => (
            <li key={el.title} className="py-4 sm:py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-400/90">
                {el.label}
              </p>
              <p className="mt-1 text-base font-semibold text-white sm:text-lg">{el.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400 sm:text-base">
                {el.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
