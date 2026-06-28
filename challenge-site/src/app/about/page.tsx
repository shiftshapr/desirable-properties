import Link from 'next/link';
import {
  FRAMING_CHAPTER_REF,
  FRAMING_CHAPTER_TITLE,
  FRAMING_CHAPTER_URL,
  govhubUrl,
} from '@/lib/govhub';

export const metadata = {
  title: 'About — Desirable Properties Challenge',
  description:
    'Framing chapter for the Desirable Properties of a Meta-Layer: collective intelligence, the DP Challenge, and why properties precede protocols.',
};

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">{title}</h2>
      <div className="prose-section mt-5 space-y-4 text-lg leading-relaxed text-slate-300">
        {children}
      </div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <Link href="/" className="text-sm text-cyan-300 hover:text-cyan-200">
          ← Back to the Challenge
        </Link>

        <header className="mt-8 border-b border-slate-800 pb-10">
          <p className="text-sm font-medium uppercase tracking-[0.15em] text-cyan-400">
            {FRAMING_CHAPTER_REF}
          </p>
          <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">
            {FRAMING_CHAPTER_TITLE}
          </h1>
          <p className="mt-4 text-slate-400">
            Opening chapter · Meta-Layer Initiative · Living draft on Gov Hub
          </p>
          <a
            href={FRAMING_CHAPTER_URL}
            className="mt-6 inline-block rounded-lg bg-cyan-700 px-5 py-3 text-sm font-medium text-white hover:bg-cyan-600"
          >
            Read the full chapter on Gov Hub
          </a>
        </header>

        <div className="mt-12 space-y-14">
          <Section id="purpose" title="Purpose of This Chapter">
            <p>
              This opening chapter frames the Desirable Properties (DPs) as a shared inquiry into
              what distinguishes a layered Web from today&apos;s Web. When we refer to the
              Meta-Layer, we mean a coherent layer of community-governed overlays that enable people
              and agents to safely meet, interact, and collaborate with greater trust, consent, and
              context.
            </p>
            <p>
              The Meta-Layer can be understood as a distributed protocol for collaboration and
              interaction around digital assets and overlays, rather than a single platform or
              service. Because such a layer must be built deliberately and stewarded over time, a
              properties-based approach is appropriate. The Meta-Layer represents a qualitative
              shift in coordination, and its most significant upside is not infrastructure alone,
              but the possibility of collective intelligence at scale.
            </p>
            <p>
              This chapter is intentionally non-normative, but also precise in terms of desired
              outcomes. It provides orientation, metaphor, and context rather than requirements or
              specifications.
            </p>
          </Section>

          <Section id="engelbart" title="Engelbart and Collective Intelligence">
            <p>
              Douglas Engelbart was a systems thinker whose work anticipated the web, collaborative
              computing, and what we now call collective intelligence. He was concerned with how
              humanity might improve its collective ability to understand complex problems, make
              better decisions, and respond intelligently to accelerating change.
            </p>
            <p>
              In December 1968, the &ldquo;Mother of All Demos&rdquo; revealed an integrated system
              for augmenting human intellect—tools, interfaces, language, and shared context
              combining to expand what groups could do together. The thinking required for building
              the Meta-Layer is similar: rather than offering a finished system, we model concrete
              interactions and connective possibilities so people can grasp what becomes achievable
              when coordination, trust, and intelligence are treated as shared conditions.
            </p>
            <p>
              Engelbart focused on augmentation rather than automation. The goal was not to replace
              human judgment, but to amplify it. The Meta-Layer extends this vision to the scale and
              conditions of the contemporary internet—persistent context, shared memory, accountable
              participation, and coordinated action as prerequisites for collective intelligence.
            </p>
          </Section>

          <Section id="challenge" title="The Desirable Properties Challenge">
            <p>
              As the Web evolved into a planetary-scale social and economic substrate, it became
              clear that incremental fixes would not address its emerging failures. Vint Cerf
              articulated the challenge succinctly: if we are building a new layer on top of the
              Web, we must first be able to describe what makes it fundamentally different.
            </p>
            <p>
              Desirable Properties articulate what must be true without prescribing how it must be
              built. They describe conditions that shape what becomes possible—allowing multiple
              implementations, governance models, and technical approaches to coexist while
              remaining aligned around shared outcomes.
            </p>
            <p>
              On September 16, 2024, Cerf challenged the Meta-Layer Initiative to write an essay
              identifying the <em>desirable properties</em> of such a layer before locking in
              technical decisions—mirroring how the early Internet benefited from guiding principles
              long before formal protocols stabilized. He suggested{' '}
              <strong>Federated Strong Authentication</strong> as an initial property, emphasizing
              federation over centralization. The Desirable Properties effort emerged directly from
              this moment, with DP1 addressing trust and authentication at the outset.
            </p>
          </Section>

          <Section id="calls-for-input" title="Two Calls for Input">
            <p>
              During the first year following Cerf&apos;s challenge, the work was shaped through two
              coordinated calls for input—surfacing both lived experience and forward-looking
              concerns.
            </p>
            <p>
              The first engaged communities through the People Centered Internet, the Bridgit.io
              network, and aligned partners. The second, broader call ran through the original
              Meta-Layer Initiative site and public channels. A dedicated application aggregated
              submissions; patterns emerged clearly: trust failures are systemic, coordination
              problems span social and technical domains, and any viable Meta-Layer must address
              human and AI participation together.
            </p>
            <p>
              Those historical submissions are preserved at{' '}
              <a href="https://app.themetalayer.org" className="text-cyan-300 hover:text-cyan-200">
                app.themetalayer.org
              </a>
              . Active stewardship now continues through this Challenge and{' '}
              <a href={govhubUrl('/')} className="text-cyan-300 hover:text-cyan-200">
                Gov Hub
              </a>
              .
            </p>
          </Section>

          <Section id="layered-world" title="From a Flat Web to a Layered World">
            <p>
              The Web is often treated as a flat surface of pages and links, but it is better
              understood as a layered environment. Today&apos;s Web largely operates at the surface
              layer. The Meta-Layer is a shared digital atmosphere that sustains context, presence,
              memory, and meaning—an extension of the digital noosphere, surrounding existing
              content without replacing it.
            </p>
            <p>
              The most underappreciated limitation of today&apos;s Web is structural
              contextlessness: each interaction largely resets, identity fragments across platforms,
              and governance decisions are made without shared memory. The Meta-Layer introduces
              context as infrastructure—allowing shared context to persist above individual pages and
              platforms so trust, learning, and continuity can accumulate.
            </p>
            <p>
              When context persists, governance moves closer to where participation actually
              occurs—at the interface level, where people encounter rules, constraints, signals, and
              affordances directly.
            </p>
          </Section>

          <Section id="coordination" title="Coordination through Complexity">
            <p>
              Many persistent internet failures are failures of coordination. The Web evolved as an
              environment where actors optimize locally, with no shared reputation across platforms
              and no persistent memory of behavior across contexts.
            </p>
            <p>
              The Meta-Layer represents a shift from low-coordination environments to coordination
              through complexity—introducing durable context, visible relationships, and
              interface-level governance so actors can carry identity and accountability across
              contexts and coordinate over longer time horizons.
            </p>
          </Section>

          <Section id="collective-intelligence" title="Collective Intelligence">
            <p>
              Collective intelligence does not emerge automatically from connection or scale. It
              requires persistent context, shared memory, and legible governance as baseline
              conditions.
            </p>
            <p>
              In the Meta-Layer, AI systems are treated as cognitive amplifiers—extending perception
              and pattern recognition without displacing human judgment. AI participation is
              differentiated from human participation, subject to asymmetric constraints, and embedded
              within interface-level governance.
            </p>
          </Section>

          <Section id="how-to-read" title="How to Read the DP Chapters">
            <p>
              Each Desirable Property focuses on a single condition required for the Meta-Layer to
              function as intended. The DP chapters are not specifications or compliance
              checklists—they describe conditions that must plausibly hold for higher-order
              coordination to emerge.
            </p>
            <p>
              DP1 (Federated Strong Authentication) was suggested by Vint Cerf as an intentionally
              foundational starting point. Dependencies matter: weakness in foundational properties
              propagates upward. Each chapter can be read as a design lens: does this environment
              actually support this condition?
            </p>
            <p>
              The chapters are published as ML-Drafts—works in progress meant to evolve through
              critique, experimentation, and lived experience.
            </p>
          </Section>

          <Section id="trust" title="Why Begin with Trust">
            <p>
              Trust is the condition upon which all other forms of coordination depend. Without it,
              higher-order properties cannot function. DP1 addresses identity, accountability, and
              legitimacy directly—creating the substrate upon which other properties operate.
            </p>
            <p>
              Trust is not an outcome to be achieved after coordination succeeds. It is a
              freedom-enabling condition that expands the space of possible actions—allowing actors
              to take risks, delegate responsibility, and coordinate over longer time horizons.
            </p>
          </Section>
        </div>

        <footer className="mt-16 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="text-slate-300">
            This page summarizes the opening chapter. The authoritative, commentable draft lives on
            Gov Hub.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={FRAMING_CHAPTER_URL}
              className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
            >
              Read {FRAMING_CHAPTER_REF} on Gov Hub
            </a>
            <Link
              href="/#dps"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
            >
              Browse the DPs
            </Link>
          </div>
        </footer>
    </main>
  );
}
