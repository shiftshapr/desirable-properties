import Link from 'next/link';
import type { FaqItem } from '@/components/FaqList';
import {
  bookDiscussHref,
  DESIRABLE_PROPERTIES_BOOK_HOST,
  DESIRABLE_PROPERTIES_BOOK_TITLE,
  GOVHUB_DP_PATCHES_URL,
  GOVHUB_PUBLIC_BASE_URL,
  govhubUrl,
} from '@/lib/govhub';
import { WORKGROUPS_LIST_HREF } from '@/lib/routes';
import { BRC333_BADGES_MINT_PREVIEW_BASE } from '@/lib/brc333Links';

export type FaqSection = {
  id: string;
  title: string;
  items: FaqItem[];
};

const BOOK_MODES = (
  <>
    <p>
      On the book reader, open a chapter and select text on the page. Use the Canopi widget
      (open it via the <strong className="font-semibold text-white">Go Meta…</strong> tab,
      bottom-right of the viewer):
    </p>
    <ul>
      <li>
        <strong className="font-semibold text-white">Discuss</strong> – an anchored reply that
        adds discussion without changing the chapter text.
      </li>
      <li>
        <strong className="font-semibold text-white">Patch</strong> – propose replacing the
        selected passage with your revised text.
      </li>
      <li>
        <strong className="font-semibold text-white">Insert</strong> – propose new text that
        goes above the selection; the anchor passage stays unchanged.
      </li>
    </ul>
    <p>
      Each mode opens the Discuss composer with the anchor attached. Hover a Patch or Insert pill
      in the feed to preview the change.
    </p>
  </>
);

export const SITE_FAQ_SECTIONS: FaqSection[] = [
  {
    id: 'start-here',
    title: 'Start here',
    items: [
      {
        q: 'What is the Desirable Properties Challenge?',
        a: (
          <>
            <p>
              The Desirable Properties Challenge is a global community effort—launched by Vint
              Cerf&apos;s September 2024 question—to define what qualities a new{' '}
              <strong className="font-semibold text-white">Coordination Layer</strong> above
              today&apos;s Web should possess before it becomes everyday infrastructure.
            </p>
            <p>
              The challenge invites people everywhere to refine, debate, test, and improve living
              drafts of the Desirable Properties using Meta-Layer tools. See the{' '}
              <Link href="/challenge">Challenge timeline</Link> for milestones and the{' '}
              <Link href="/kickoff">Kickoff meeting</Link> for how it began.
            </p>
          </>
        ),
      },
      {
        q: 'What is the Meta-Layer?',
        a: (
          <>
            <p>
              The Meta-Layer is a community-governed coordination layer above today&apos;s Web—a
              shared digital atmosphere that sustains context, presence, memory, and meaning without
              replacing existing content.
            </p>
            <p>
              It enables people and agents to meet, interact, and collaborate with greater trust,
              consent, and context. Read the full framing on{' '}
              <Link href="/about">About</Link>.
            </p>
          </>
        ),
      },
      {
        q: 'What are Desirable Properties (DPs)?',
        a: (
          <>
            <p>
              Desirable Properties are shared design criteria that describe what must be true for
              the Meta-Layer to function—trust, agency, safety, accountability, contextual
              integrity, collective intelligence, and human flourishing—without prescribing how
              they must be built.
            </p>
            <p>
              The current working draft lists 23 canonical DPs in Version 0.77. The set is not
              assumed complete.{' '}
              <Link href="/#dps">Browse the DPs</Link>.
            </p>
          </>
        ),
      },
      {
        q: 'How is this different from a technical spec or RFC?',
        a: (
          <>
            <p>
              DPs describe outcomes and conditions—the &ldquo;what&rdquo; humanity wants the
              Meta-Layer to enable. Technical specifications, Architecture Decision Records (ADRs),
              and ML-RFCs follow once those outcomes are clear enough to guide implementation.
            </p>
            <p>
              Multiple implementations, governance models, and technical approaches can coexist while
              remaining aligned around shared outcomes. See{' '}
              <Link href="/participate">Participate</Link> for how Version 1.0 becomes the
              foundation for substrate work.
            </p>
          </>
        ),
      },
      {
        q: 'What is Version 0.77 vs Version 1.0?',
        a: (
          <>
            <p>
              <strong className="font-semibold text-white">Version 0.77</strong> is the current
              open working draft—developed through AI-assisted synthesis, two Calls for Input, and
              community stewardship. It is open for public review now.
            </p>
            <p>
              <strong className="font-semibold text-white">Version 1.0</strong> is the
              community-synthesized foundation targeted for release on{' '}
              <strong className="font-semibold text-white">November 13, 2026</strong>.{' '}
              <strong className="font-semibold text-white">September 16, 2026</strong> marks the
              Community Review Draft milestone and governance feedback workflow demonstration.
            </p>
          </>
        ),
      },
      {
        q: 'Who runs this?',
        a: (
          <>
            <p>
              The Desirable Properties Challenge is stewarded by the Meta-Layer Initiative and its
              community. The challenge site (
              <code className="text-sm text-slate-400">desirableproperties.org</code>) is the
              participation hub; the{' '}
              <strong className="font-semibold text-white">Interface Governance Hub</strong> (Gov
              Hub) hosts draft documents, patches, and workgroup governance; and the book reader
              supports chapter-level Discuss, Patch, and Insert.
            </p>
            <p>
              People make decisions. AI tools like Deepi help organize conversation—they do not
              replace community judgment.
            </p>
          </>
        ),
      },
      {
        q: 'Do I need to be technical to participate?',
        a: (
          <>
            <p>
              No. You can read and comment on chapters, use Discuss / Patch / Insert on the book,
              submit text patches on the Interface Governance Hub, propose candidate DPs, join a
              workgroup, or spend ten minutes with the DP Community AI to integrate existing
              ideas.
            </p>
            <p>
              Thoughtful critique, examples, and lived experience are as valuable as implementation
              expertise. See <Link href="/participate">all the ways to contribute</Link>.
            </p>
          </>
        ),
      },
      {
        q: 'Where should I start?',
        a: (
          <>
            <p>A practical path for newcomers:</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>
                Read the framing on <Link href="/about">About</Link>.
              </li>
              <li>
                Browse the <Link href="/#dps">23 DPs</Link> and pick one chapter that interests
                you.
              </li>
              <li>
                Open the book and try <strong className="font-semibold text-white">Discuss</strong>
                , <strong className="font-semibold text-white">Patch</strong>, or{' '}
                <strong className="font-semibold text-white">Insert</strong> on a passage—or patch
                the same draft on{' '}
                <a href={GOVHUB_DP_PATCHES_URL} target="_blank" rel="noopener noreferrer">
                  Gov Hub
                </a>
                .
              </li>
              <li>
                Optional: use the <Link href="/agent">DP Community AI</Link> or{' '}
                <Link href={WORKGROUPS_LIST_HREF}>join a workgroup</Link> when you want deeper
                involvement.
              </li>
            </ol>
          </>
        ),
      },
    ],
  },
  {
    id: 'participate',
    title: 'How to participate',
    items: [
      {
        q: 'What are the main ways to contribute?',
        a: (
          <>
            <p>Three paths, depending on how much time you have:</p>
            <ul>
              <li>
                <strong className="font-semibold text-white">Integrate your ideas</strong> (~10
                min) – use the DP Community AI to compare your notes, papers, or projects with
                current DPs. <Link href="/agent">Open Deepi →</Link>
              </li>
              <li>
                <strong className="font-semibold text-white">Review the Desirable Properties</strong>{' '}
                (~1–3 hours) – read chapters on the book and contribute via Discuss, Patch, or
                Insert; or submit passage-level patches on the Interface Governance Hub.{' '}
                <Link href="/participate">Participate →</Link>
              </li>
              <li>
                <strong className="font-semibold text-white">Join a workgroup</strong> (~2–10+
                hours) – help synthesize community feedback into Version 1.0 for one or more DPs.{' '}
                <Link href={WORKGROUPS_LIST_HREF}>Browse workgroups →</Link>
              </li>
            </ul>
          </>
        ),
      },
      {
        q: 'Discuss, Patch, and Insert—what\'s the difference?',
        a: (
          <>
            <p>
              On <strong className="font-semibold text-white">{DESIRABLE_PROPERTIES_BOOK_HOST}</strong>
              , all three modes start from selected text in a chapter:
            </p>
            {BOOK_MODES}
            <p className="mt-3">
              <strong className="font-semibold text-white">On the Interface Governance Hub</strong>{' '}
              (Gov Hub), <strong className="font-semibold text-white">Patch</strong> means something
              slightly different: open an ML-Draft, select a passage, and submit a formal text
              revision for community review—without using the book&apos;s Discuss / Patch / Insert
              widget. Both channels feed the same editorial process.{' '}
              <a href={GOVHUB_DP_PATCHES_URL} target="_blank" rel="noopener noreferrer">
                Patch drafts on Gov Hub →
              </a>
            </p>
          </>
        ),
      },
      {
        q: 'Can I patch directly on the book?',
        a: (
          <>
            <p>
              Yes. Select text in a chapter and choose <strong className="font-semibold text-white">Patch</strong>{' '}
              to propose replacing the passage, or <strong className="font-semibold text-white">Insert</strong>{' '}
              to propose new text above it. Use <strong className="font-semibold text-white">Discuss</strong>{' '}
              when you want to comment without changing the text.
            </p>
            <p>
              Open Canopi via the <strong className="font-semibold text-white">Go Meta…</strong>{' '}
              tab on the book viewer. For formal draft revisions outside the book widget, use the{' '}
              <a href={GOVHUB_DP_PATCHES_URL} target="_blank" rel="noopener noreferrer">
                Interface Governance Hub patch flow
              </a>
              .
            </p>
          </>
        ),
      },
      {
        q: 'What is Deepi (the DP Community AI)?',
        a: (
          <>
            <p>
              Deepi is the DP Community AI. It helps clarify what Desirable Properties mean,
              surface tensions, compare your ideas with existing DPs, identify gaps, and draft
              suggested patches—preparing your thinking for community discussion.
            </p>
            <p>
              Sign in to chat at <Link href="/agent">desirableproperties.org/agent</Link>. Your
              conversations are saved in the sidebar. Deepi assists; people and workgroups make
              decisions.
            </p>
          </>
        ),
      },
      {
        q: 'How do I propose a new Desirable Property?',
        a: (
          <>
            <p>
              Submit a candidate DP on the Interface Governance Hub. The{' '}
              <strong className="font-semibold text-white">DP Discovery</strong> workgroup triages
              community submissions, runs open calls for emerging challenges, and shepherds
              promising candidates toward Challenge inclusion.
            </p>
            <p>
              <a
                href={govhubUrl('/submit/?layer=the-metaweb')}
                target="_blank"
                rel="noopener noreferrer"
              >
                Submit a candidate DP →
              </a>{' '}
              · <Link href="/#missing">Missing something?</Link> on the home page
            </p>
          </>
        ),
      },
      {
        q: 'What happened to earlier submissions (Calls for Input)?',
        a: (
          <>
            <p>
              Two coordinated Calls for Input shaped the current draft—first through People
              Centered Internet, Bridgit.io, and aligned partners; then through a broader public
              call whose submissions were preserved as Bitcoin Ordinal inscriptions.
            </p>
            <p>
              Historical submissions remain at{' '}
              <a href="https://app.themetalayer.org" target="_blank" rel="noopener noreferrer">
                app.themetalayer.org
              </a>{' '}
              and on the <Link href="/onchain">On-Chain</Link> page. Active stewardship continues
              here and on Gov Hub.
            </p>
          </>
        ),
      },
      {
        q: 'I have a question not covered here—where do I ask?',
        a: (
          <>
            <p>
              Use the <Link href="/support">Support</Link> page for challenge questions, workgroup
              help, technical issues, and content clarification. You can attach screenshots and
              include context about the page you were on.
            </p>
          </>
        ),
      },
    ],
  },
  {
    id: 'sites-tools',
    title: 'Sites & tools',
    items: [
      {
        q: 'What is desirableproperties.org vs book.desirableproperties.org vs the Interface Governance Hub?',
        a: (
          <>
            <ul>
              <li>
                <strong className="font-semibold text-white">desirableproperties.org</strong> – the
                Challenge hub: timeline, DPs, workgroups, Deepi, badges, activity, and events.
              </li>
              <li>
                <strong className="font-semibold text-white">{DESIRABLE_PROPERTIES_BOOK_HOST}</strong>{' '}
                – the book reader. Read chapters and contribute via Discuss, Patch, and Insert
                (Canopi widget via Go Meta…).
              </li>
              <li>
                <strong className="font-semibold text-white">Interface Governance Hub</strong> (Gov
                Hub at{' '}
                <code className="text-sm text-slate-400">{new URL(GOVHUB_PUBLIC_BASE_URL).hostname}</code>
                ) – draft documents, formal passage patches, workgroup membership, and layer
                governance.
              </li>
            </ul>
          </>
        ),
      },
      {
        q: 'What is The Layered Web?',
        a: (
          <>
            <p>
              <em>{DESIRABLE_PROPERTIES_BOOK_TITLE}</em> is the formal title of the Desirable
              Properties book—a working draft published as ML-Drafts and evolving through community
              Discuss, Patch, Insert, and Gov Hub revisions.
            </p>
            <p>
              Version 1.0 targets <strong className="font-semibold text-white">November 13, 2026</strong>,
              with a permanent Ordinal edition as part of the Digital Monument. The{' '}
              <strong className="font-semibold text-white">September 16, 2026</strong> milestone
              shares the Community Review Draft. <Link href="/onchain">Browse on-chain →</Link>
            </p>
          </>
        ),
      },
      {
        q: 'What is the Interface Governance Hub?',
        a: (
          <>
            <p>
              The <strong className="font-semibold text-white">Interface Governance Hub</strong>{' '}
              (abbreviated <strong className="font-semibold text-white">Gov Hub</strong>) is the
              Meta-Layer&apos;s document tracker and governance surface. Read ML-Drafts, submit
              passage-level patches, join workgroups, and follow editorial process for the
              Desirable Properties layer.
            </p>
            <p>
              <a href={govhubUrl('/')} target="_blank" rel="noopener noreferrer">
                Open Gov Hub →
              </a>
            </p>
          </>
        ),
      },
      {
        q: 'Why does sign-in sometimes open Gov Hub?',
        a: (
          <>
            <p>
              The challenge site, book reader, and Interface Governance Hub share a single sign-in
              (Web3Auth with Google). After you authenticate, you may be redirected to Gov Hub to
              complete a join, nominate, or handoff flow—or returned to the page you started from.
            </p>
            <p>
              Your session works across these surfaces so you do not need separate accounts.
            </p>
          </>
        ),
      },
      {
        q: 'Is there a staging site?',
        a: (
          <>
            <p>
              Yes. <strong className="font-semibold text-white">staging.desirableproperties.org</strong>{' '}
              previews challenge-site changes before production deploy. It uses dev Gov Hub (
              <code className="text-sm text-slate-400">dev.hub.themetalayer.org</code>) and staging
              book hosts, but it shares the same challenge-site database as production (
              <code className="text-sm text-slate-400">DP_DATABASE_URL</code> from{' '}
              <code className="text-sm text-slate-400">.env.local</code>).
            </p>
            <p>
              <strong className="font-semibold text-white">Important:</strong> actions on staging—
              support tickets, signups, Deepi sessions, broadcasts, and other stored data—can
              affect your real account and appear on production. Treat staging as a shared platform,
              not an isolated sandbox.
            </p>
          </>
        ),
      },
    ],
  },
  {
    id: 'timeline',
    title: 'Timeline & events',
    items: [
      {
        q: 'What\'s happening right now?',
        a: (
          <>
            <p>
              See the live phase on the{' '}
              <Link href="/challenge#timeline">Challenge timeline</Link>. Key upcoming milestones
              include community review (August 2026), Community Review Draft preparation (early
              September 2026), the September 16 Community Review Draft milestone, and Version 1.0
              release on November 13, 2026.
            </p>
          </>
        ),
      },
      {
        q: 'When is Version 1.0 and the Community Review Draft milestone?',
        a: (
          <>
            <p>
              Workgroups prepare the Community Review Draft in early September 2026.{' '}
              <strong className="font-semibold text-white">September 16, 2026</strong> is the public
              Community Review Draft milestone and governance feedback workflow demonstration.{' '}
              <strong className="font-semibold text-white">November 13, 2026</strong> is the target
              Version 1.0 release and Digital Monument publication.
            </p>
            <p>
              <Link href="/book">Read the book →</Link>
            </p>
          </>
        ),
      },
      {
        q: 'What was the kickoff meeting?',
        a: (
          <>
            <p>
              On September 16, 2024, Vint Cerf joined the Meta-Layer community to discuss what
              desirable properties a new coordination layer should possess—launching the challenge
              and suggesting Federated Strong Authentication as an initial property (DP1).
            </p>
            <p>
              <Link href="/kickoff">Read the kickoff summary →</Link>
            </p>
          </>
        ),
      },
      {
        q: 'Where do I find upcoming events?',
        a: (
          <>
            <p>
              Use the <strong className="font-semibold text-white">Events</strong> item in the site
              navigation and the <Link href="/events">Events index</Link> for series, pathways, and
              sessions.
            </p>
          </>
        ),
      },
    ],
  },
  {
    id: 'workgroups',
    title: 'Workgroups',
    items: [
      {
        q: 'What is a workgroup?',
        a: (
          <>
            <p>
              A Desirable Properties workgroup is a focused team that stewards one DP (or DP
              Discovery) through synthesis—reviewing comments, patches, and proposals, building
              rough consensus, and preparing recommended revisions for the editorial process
              toward Version 1.0.
            </p>
            <p>
              Most collaboration is async. <Link href={WORKGROUPS_LIST_HREF}>Browse workgroups →</Link>
            </p>
          </>
        ),
      },
      {
        q: 'Join vs nominate a coordinator?',
        a: (
          <>
            <p>
              <strong className="font-semibold text-white">Join</strong> when you want to contribute
              as a member—reviewing, discussing, drafting, or taking a flexible role like Recorder
              or Liaison.
            </p>
            <p>
              <strong className="font-semibold text-white">Nominate</strong> when you want to propose
              yourself or someone else as Workgroup Coordinator. The layer admin reviews and
              approves nominations.
            </p>
            <p>
              <Link href="/workgroups#join-vs-nominate">Join vs nominate →</Link>
            </p>
          </>
        ),
      },
      {
        q: 'Where are the workgroup-specific FAQs?',
        a: (
          <>
            <p>
              The workgroups page has additional FAQs about choosing a group, time commitment,
              multiple memberships, and how coordinators are chosen.
            </p>
            <p>
              <Link href="/workgroups#faq">Workgroup FAQ →</Link>
            </p>
          </>
        ),
      },
    ],
  },
  {
    id: 'badges-onchain',
    title: 'Recognition & on-chain',
    items: [
      {
        q: 'What are DP badges?',
        a: (
          <>
            <p>
              Each Desirable Property has a base badge. When you contribute to a specific DP, you
              can earn that property&apos;s badge—with optional role overlays (Member, Workgroup
              Coordinator, Patch Contributor, Steward, and others).
            </p>
            <p>
              Minted badges can link to patches, discussions, workgroup docs, and other public
              evidence of your work. <Link href="/badges">Browse badges →</Link>
            </p>
          </>
        ),
      },
      {
        q: 'Do badges grant governance rights?',
        a: (
          <>
            <p>
              No. Badges recognize contribution. They do not confer ownership, authority, or voting
              power by themselves. Governance follows the Interface Governance Hub and workgroup
              processes.
            </p>
          </>
        ),
      },
      {
        q: 'What is the on-chain book / Digital Monument?',
        a: (
          <>
            <p>
              <em>{DESIRABLE_PROPERTIES_BOOK_TITLE}</em> is inscribed as a BRC333 book on Bitcoin
              Ordinals—a permanent record of the community-developed Desirable Properties. The
              challenge site&apos;s <Link href="/onchain">On-Chain</Link> page indexes PCI emails,
              Call for Input submissions, and inscribed DP drafts.
            </p>
          </>
        ),
      },
      {
        q: 'How do I claim or mint a badge?',
        a: (
          <>
            <p>
              Badge minting is tied to documented contribution—patches, workgroup participation,
              reviews, and similar public records. Claim and mint flows are rolling out with the
              Challenge; preview artwork and metadata on the badges ordinal project.
            </p>
            <p>
              <a href={BRC333_BADGES_MINT_PREVIEW_BASE} target="_blank" rel="noopener noreferrer">
                Preview badge mint →
              </a>{' '}
              · <Link href="/badges">Badges page →</Link>
            </p>
          </>
        ),
      },
    ],
  },
  {
    id: 'concepts',
    title: 'Concepts',
    items: [
      {
        q: 'Why start with trust / DP1?',
        a: (
          <>
            <p>
              Vint Cerf suggested <strong className="font-semibold text-white">Federated Strong
              Authentication</strong> as an intentionally foundational starting point. Trust is the
              condition upon which other coordination depends—without it, higher-order properties
              cannot function reliably.
            </p>
            <p>
              <Link href="/about#trust">Why begin with trust →</Link> ·{' '}
              <Link href="/dp/DP1">DP1 chapter →</Link>
            </p>
          </>
        ),
      },
      {
        q: 'How does AI fit in the Meta-Layer?',
        a: (
          <>
            <p>
              AI systems are treated as cognitive amplifiers—extending perception and pattern
              recognition without displacing human judgment. AI participation is differentiated
              from human participation, subject to asymmetric constraints, and embedded within
              interface-level governance.
            </p>
            <p>
              Deepi assists the DP Challenge; workgroup and editorial decisions remain human-led.{' '}
              <Link href="/pathways/ai-human-agency">AI & Human Agency pathway →</Link>
            </p>
          </>
        ),
      },
      {
        q: 'What is collective intelligence here?',
        a: (
          <>
            <p>
              Collective intelligence does not emerge automatically from connection or scale. It
              requires persistent context, shared memory, and legible governance as baseline
              conditions—the environment the Meta-Layer is designed to support.
            </p>
            <p>
              <Link href="/about#collective-intelligence">Read more on About →</Link>
            </p>
          </>
        ),
      },
      {
        q: 'What is a layered Web vs today\'s flat Web?',
        a: (
          <>
            <p>
              Today&apos;s Web is often treated as a flat surface of pages and links, but it is
              better understood as layered. The Meta-Layer introduces context as
              infrastructure—shared context that persists above individual pages and platforms so
              trust, learning, and continuity can accumulate.
            </p>
            <p>
              <Link href="/about#layered-world">From a flat Web to a layered world →</Link>
            </p>
          </>
        ),
      },
      {
        q: 'Are DPs final?',
        a: (
          <>
            <p>
              No. DP chapters are published as ML-Drafts—works in progress meant to evolve through
              Discuss, Patch, Insert, critique, experimentation, and lived experience. Version 1.0
              is a milestone, not the end of iteration.
            </p>
            <p>
              The current 23 DPs are not assumed complete; DP Discovery continues to surface
              candidate properties. <Link href="/#missing">Help identify gaps →</Link>
            </p>
          </>
        ),
      },
    ],
  },
];

/** Total FAQ count across all sections (for verification). */
export const SITE_FAQ_COUNT = SITE_FAQ_SECTIONS.reduce(
  (sum, section) => sum + section.items.length,
  0,
);
