import Link from 'next/link';
import DiscussPatchLink from '@/components/DiscussPatchLink';
import KickoffRecording from '@/components/KickoffRecording';
import { bookIntroDiscussHref, DESIRABLE_PROPERTIES_BOOK_TITLE } from '@/lib/govhub';

export const metadata = {
  title: 'Kickoff Meeting – Desirable Properties',
  description:
    'Summary of the September 16, 2024 Meta-Layer Initiative kickoff with Vint Cerf: infrastructure lessons, breakouts, and the first milestone that became the Desirable Properties essay.',
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

/** Keep a real space after bold leads. Next.js otherwise emits `</strong>Prefer`. */
function Term({ children }: { children: React.ReactNode }) {
  return (
    <>
      <strong className="font-semibold text-white">{children}</strong>
      {' '}
    </>
  );
}

export default function KickoffPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <Link href="/about" className="text-sm text-cyan-300 hover:text-cyan-200">
        ← About
      </Link>

      <header className="mt-8 border-b border-slate-800 pb-10">
        <p className="text-sm font-medium uppercase tracking-[0.15em] text-cyan-400">
          September 16, 2024 · Zoom
        </p>
        <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">
          Meta-Layer Initiative kickoff
        </h1>
        <p className="mt-4 text-lg text-slate-400">
          A working session with special guest Vint Cerf that asked what would make a new layer
          above the Web worth building–and named an essay on desirable properties as the first
          milestone.
        </p>
        <p className="mt-4 text-sm text-slate-500">
          Summary prepared from the meeting recording. Names and quotes are lightly corrected from
          the transcript where the audio is clear.
        </p>
      </header>

      <nav className="mt-8 rounded-xl border border-slate-800 bg-slate-900/40 p-5 text-sm">
        <p className="font-medium text-slate-200">On this page</p>
        <ul className="mt-3 grid gap-2 text-cyan-300 sm:grid-cols-2">
          <li>
            <a href="#recording" className="hover:text-cyan-200">
              Recording
            </a>
          </li>
          <li>
            <a href="#welcome" className="hover:text-cyan-200">
              Welcome
            </a>
          </li>
          <li>
            <a href="#cerf" className="hover:text-cyan-200">
              Cerf on infrastructure
            </a>
          </li>
          <li>
            <a href="#qa" className="hover:text-cyan-200">
              Questions for Vint
            </a>
          </li>
          <li>
            <a href="#purpose" className="hover:text-cyan-200">
              Purpose of the meeting
            </a>
          </li>
          <li>
            <a href="#breakouts" className="hover:text-cyan-200">
              Breakouts
            </a>
          </li>
          <li>
            <a href="#reports" className="hover:text-cyan-200">
              Report-outs
            </a>
          </li>
          <li>
            <a href="#stay-on" className="hover:text-cyan-200">
              After the official close
            </a>
          </li>
          <li>
            <a href="#next-steps" className="hover:text-cyan-200">
              Next steps
            </a>
          </li>
        </ul>
      </nav>

      <div className="mt-12 space-y-14">
        <KickoffRecording />

        <Section id="welcome" title="Welcome and housekeeping">
          <p>
            Daveed Benjamin opened the Zoom with Liz and Brad as co-organizers. The group was asked
            to stay muted unless speaking, raise a hand or use chat for questions, and treat the
            session as a working meeting rather than a lecture. Note-takers were already in place,
            and Liz planned short breakouts after the opening remarks.
          </p>
          <p>
            Daveed introduced Vint Cerf as one of the fathers of the Internet, Google&apos;s Chief
            Internet Evangelist, and a reader of <em>The Metaweb</em> who had already commented on
            the book. Cerf joked that he had words, but whether they were wise was for others to
            decide.
          </p>
        </Section>

        <Section id="cerf" title="Vint Cerf: treat the Meta-Layer as infrastructure">
          <p>
            Cerf framed the proposal as infrastructure layered on top of the existing Internet–or
            whatever the Internet becomes. The lesson from IP, he said, is to stay agnostic about
            the layer below: IP does not care whether bits travel over radio, fiber, or copper. It
            only asks whether a bundle of bits can be delivered with some probability greater than
            zero. Recovery, reliability, and low latency live above that.
          </p>
          <p>He extracted several design implications from the Internet&apos;s history:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <Term>Standards.</Term>
              Interoperability cannot depend on pairwise negotiation. Standards let parties who will
              never meet still interwork, and they let competing products share properties so
              customers have choice.
            </li>
            <li>
              <Term>Broad adoption.</Term>
              Infrastructure only pays off if it is widely used.
            </li>
            <li>
              <Term>Self-sustaining business models.</Term>
              Early Internet backbones were government-sponsored (DARPA, NSF, DOE, NASA) and limited
              by acceptable-use policy. Cerf described connecting MCI Mail to the NSFNET backbone
              in 1988 as a deliberate break of that policy. Commercial ISPs (UUNET, PSINet, CERFnet)
              and equipment vendors followed. Some firms failed or were acquired; the point was that
              a business model had to support both spread and ongoing enhancement.
            </li>
            <li>
              <Term>Simplicity.</Term>
              Prefer one way to do a thing. Multiple options force a negotiation before two parties
              can talk–the problem he associated with X.25 and OSI&apos;s many transport protocols.
            </li>
            <li>
              <Term>Safety, security, and strong authenticity.</Term>
              Because the layer will touch identity and high-consequence transactions (finance,
              medicine), it must resist attack. AI and large language models raise the stakes: they
              will be invited to act on users&apos; behalf, and they hallucinate. His elevator
              example: once the door closes, you depend entirely on someone else&apos;s software.
            </li>
          </ul>
          <p>
            Demographics, he added, will push societies toward robotics and AI taking actions people
            once took. Humans already make mistakes; software will too. The design question is how
            to reduce the likelihood of costly ones. The most important question before
            implementation: <em>what could possibly go wrong?</em>
          </p>
        </Section>

        <Section id="qa" title="Questions for Vint">
          <p>
            <Term>Accountability and agency.</Term>
            Daveed asked about accountability. Cerf said his two watchwords are accountability and agency.
            He once favored anonymity as a default. He still believes people should not have to
            identify themselves merely to use Internet resources–but online systems now amplify
            everything, including harm. Cross-border damage is hard to police (he noted the UN
            cybercrime treaty debate and the Budapest Convention). Accountability requires
            identification. Agency is the other side: strong authentication protects you from
            software or people taking unauthorized actions in your name. Any agent acting for a
            person needs carefully designed transitive authority–no implied consent.
          </p>
          <p>
            <Term>Why pricing was left out of the protocol.</Term>
            Eric Harris-Braun (Holochain) asked who decided not to put cost and
            pricing into the Internet&apos;s protocol design. Cerf said it was circumstance, not a
            commercial theory: ARPANET and the Internet were paid for by DARPA as command-and-control
            infrastructure, not as a market. Kahn and Cerf published the 1974 IEEE design so allies
            could implement it–and they published it openly because they could not know who the
            allies would be 25 years later.
          </p>
          <p>
            <Term>Encryption after quantum computers.</Term>
            Asked which encryption standards would be needed, Cerf said RSA-style
            algorithms that rely on factoring are under a future quantum threat (Shor&apos;s
            algorithm). He did not believe a quantum computer could yet break significant crypto,
            but information that must stay secret for decades needs post-quantum algorithms now.
            NIST had collected dozens of lattice-based candidates and down-selected a small set for
            signatures and encryption. Google had begun implementing them.
          </p>
          <p>
            <Term>What might be next.</Term>
            Quantum entanglement, he said, does not give zero-delay communication. If there is a next big
            thing, it is likely AI. LLM failures, in his view, are failures of context: a chatbot
            asked to write his obituary invented a death date, conflated other people&apos;s careers
            with his, and fabricated family members. Larger context windows help generation but do
            not fix training that lacks adequate context. He pointed toward smaller specialist
            models collaborating–closer to Minsky&apos;s <em>Society of Mind</em>–before trusting
            these systems to act in the world.
          </p>
        </Section>

        <Section id="purpose" title="Purpose: an application substrate above the page">
          <p>
            After Cerf&apos;s remarks, Daveed stated the meeting&apos;s purpose: launch a
            collaborative of people and organizations willing to help build an application substrate
            for an environment above the webpage–what he had been calling the Overweb. The aim was a
            common identity space and security model, plus a way to manage how AIs interact in that
            environment, kept as lightweight, protocol-agnostic, and simple as possible.
          </p>
          <p>
            The inspiration was context. Around 2015 he saw the commercial web starve outbound
            links: social-media feeds replaced web surfing, and platforms were rewarded for keeping
            people on-site. The work, he said, is also older than the Web. Annotation is a
            thousand-year human practice that was present in early knowledge systems and in Mosaic,
            then stripped from the browser under commercial pressure. Marc Andreessen later invested
            in Rap Genius in part to restore layering knowledge on knowledge–and wondered what the
            world would look like if annotation had stayed in the browser.
          </p>
        </Section>

        <Section id="breakouts" title="Three guiding questions">
          <p>
            Liz facilitated roughly 10–12 minutes of breakouts (one round, not five-minute hops)
            around three questions. Groups could spend unequal time; they were asked to bring back
            at least one useful answer:
          </p>
          <ol className="list-decimal space-y-2 pl-6">
            <li>
              What unique, valuable contribution can this group make to the Meta-Layer–not
              everything that could be done, but what this constellation is best positioned to do?
            </li>
            <li>What would a meaningful first milestone look like?</li>
            <li>How should the group organize itself to reach that milestone?</li>
          </ol>
          <p>
            In the host/note-taker room, Cerf argued against boiling the ocean. A focused
            contribution could be a standard for{' '}
            <strong className="font-semibold text-white">federated strong authentication</strong>
            –multiple competitive authenticators, with oversight
            analogous to how browsers treat certificate authorities. He then named a concrete
            exercise: an essay titled <em>Desirable Properties of the Meta-Layer</em>. Making
            properties specific would reveal the ensemble of things the layer must implement. For
            any chosen property, ask what would have to be true, what assumptions and agreements
            are required, and who is accountable if an authenticated party behaves badly.
          </p>
          <p>
            That room also discussed a cultural shift: more credibility for people who deliberately
            identify themselves; provenance for information (as in the art world); nanopublications
            as a way to open micro-scale scholarly contribution; and the downside of open feedback
            (false copyright claims against YouTube). Strong authentication creates a path to
            reputation, compensation, and “penalty box” feedback loops. Badging, a landscape of
            existing overlay projects (Hypothesis and others), and a glossary–not only a word
            cloud–were suggested as supporting artifacts.
          </p>
        </Section>

        <Section id="reports" title="What the rooms brought back">
          <p>Liz asked each room for a short readout. Themes that surfaced:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <Term>Identity, privacy, and proof of humanity.</Term>
              Annotation needs trust in who is writing, and many annotators still need privacy or
              anonymity.
            </li>
            <li>
              <Term>Commerce and safety.</Term>
              How the layer might support exchange without becoming an unsafe space.
            </li>
            <li>
              <Term>Standards from implementation.</Term>
              Interoperability and open process; standards that emerge from communities actually
              building, then coming together.
            </li>
            <li>
              <Term>Use cases still unclear.</Term>
              Several people said they did not yet see what would motivate ordinary users.
            </li>
            <li>
              <Term>Adjacent work.</Term>
              The liminal web, Goodly Labs / Public Editor (annotating news for manipulative
              language), and other protocols that might link these efforts.
            </li>
            <li>
              <Term>Shared target and funding.</Term>
              Many disciplines and some corporate walls; a common outcome, a roadmap, and a clear
              funding path (new foundation vs. existing apparatus) were named as organizing needs.
            </li>
          </ul>
          <p>
            Daveed reported the host room&apos;s proposal: focus on a standard for federated strong
            authentication; write an essay on the desirable properties of the Meta-Layer as the
            first milestone; map who is already operating in this space; and synthesize qualitative
            and quantitative notes from the collaborative document.
          </p>
        </Section>

        <Section id="stay-on" title="After the official close">
          <p>
            The formal meeting closed with thanks to Cerf and the participants. A smaller group
            stayed on. Brad asked for visuals and simple UX experiments so people could picture the
            idea. Others tied that to funding: a first milestone should be something you can put in
            a grant proposal; short-, mid-, and long-term goals; and business models, not only
            vision.
          </p>
          <p>
            On use cases, Daveed said they are as vast as the Internet itself–more context on any
            page. Liz pushed toward the art of the practical: one pinprick human problem, solved
            with low friction, rather than another decentralized solution searching for a problem.
            Trust was named as a pillar, not a late add-on–trust in outcomes, in operators of
            infrastructure, and in authentication as the basis for accountable collaboration.
          </p>
          <p>
            Mental models that landed: a community “data water main” that clients can tap; start
            with a specific community (as the early Internet started with a defense community and
            its allies) and reduce friction between communities; start with trust, not end with it;
            and <em>meta-community</em>–knowing that people you meet above a page are real people in
            good standing, with presence and artifacts that persist across the Web.
          </p>
          <p>
            A late technical thread covered ledgers, browser tech, Web3, and AI interfaces. Cerf
            had already pointed to NIST post-quantum work. Stay-on participants warned that new
            algorithms are easy to implement badly (Heartbleed as a caution), hybrid deployments
            may be safer than a sudden cutover, and the group should keep anonymous, private,
            secret, and confidential from collapsing into one word.
          </p>
        </Section>

        <Section id="next-steps" title="Next steps">
          <p>Commitments from the room that day:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              Email everyone who attended and those who could not, with a link to the collaborative
              notes.
            </li>
            <li>
              Ask participants to add breakout insights and later reflections to that document.
            </li>
            <li>
              Propose a first milestone to the group and invite people to organize around it. The
              leading candidate was an essay on the <em>desirable properties</em> of the Meta-Layer,
              with federated strong authentication as an early property to make concrete.
            </li>
            <li>
              Draft a landscape of projects already operating in this overlay space, plus visuals
              that make the user experience graspable.
            </li>
            <li>
              Treat funding and a practical, trusted first use case as part of the organizing work,
              not a later afterthought.
            </li>
          </ul>
          <p>
            That milestone is the work now underway. The essay became the Desirable Properties
            drafts, the Challenge, and the book in public review.
          </p>
        </Section>
      </div>

      <footer className="mt-16 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <p className="text-slate-300">
          Continue from the kickoff: read the framing chapter, browse the current properties, or
          join a workgroup.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/about"
            className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
          >
            About the framing
          </Link>
          <DiscussPatchLink
            href={bookIntroDiscussHref()}
            className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600"
          >
            Read {DESIRABLE_PROPERTIES_BOOK_TITLE}
          </DiscussPatchLink>
          <Link
            href="/#dps"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
          >
            Browse the DPs
          </Link>
          <Link
            href="/challenge"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
          >
            Challenge timeline
          </Link>
        </div>
      </footer>
    </main>
  );
}
