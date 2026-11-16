import type { Metadata } from 'next';
import Link from 'next/link';
import V1LaunchPlayer from '@/components/V1LaunchPlayer';
import transcript from '@/data/v1-launch-transcript.json';
import {
  V1_LAUNCH_EVENT_PATH,
  V1_LAUNCH_POSTER,
  V1_LAUNCH_TRANSCRIPT_VTT,
  V1_LAUNCH_VIDEO_TITLE,
  V1_LAUNCH_YOUTUBE_ID,
  videoClock,
} from '@/lib/v1-launch-event';
import { SITE_NAME } from '@/lib/site-metadata';

const TITLE = 'Version 1.0 launch';
const DATE_LABEL = 'Friday 13 November 2026';
const DESCRIPTION =
  'Watch the Version 1.0 launch of The Layered Web: The Desirable Properties of a Meta-Layer (13 November 2026), with a summary of what was said and the full transcript.';
const SHARE_IMAGE = {
  url: V1_LAUNCH_POSTER,
  width: 1280,
  height: 720,
  alt: 'The Layered Web, Version 1.0 launch, 13 November 2026',
};

export const metadata: Metadata = {
  title: `${TITLE}, ${DATE_LABEL} | ${SITE_NAME}`,
  description: DESCRIPTION,
  alternates: { canonical: V1_LAUNCH_EVENT_PATH },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: `The Layered Web: ${TITLE}`,
    description: DESCRIPTION,
    url: V1_LAUNCH_EVENT_PATH,
    images: [SHARE_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: `The Layered Web: ${TITLE}`,
    description: DESCRIPTION,
    images: [SHARE_IMAGE],
  },
};

const LINKS: Array<{ label: string; href: string; note: string }> = [
  { label: 'Read online', href: 'https://book.desirableproperties.org', note: 'book.desirableproperties.org' },
  { label: 'Book + PDF', href: '/v1', note: 'desirableproperties.org/v1' },
  { label: 'Help shape 1.1', href: '/improve', note: 'desirableproperties.org/improve' },
  { label: 'How 1.0 was decided', href: '/steering', note: 'desirableproperties.org/steering' },
];

const SPEAKERS: Array<[string, string]> = [
  ['Daveed Benjamin', 'host. Presented the book and how it was made, and demonstrated Canopi.'],
  ['Kevin Clark', 'why the book is now called The Layered Web, and the book as a “requirements document”.'],
  ['Sandra Ponce de Leon', 'asked whether the book describes the web we would design if we could start again.'],
  ['Nada El Mais', '(Lebanon) on DP18 Feedback Loops and Reputation.'],
  ['Markabadi', 'co-editor of DP19 and co-host; asked about browsers, patching other people’s websites, and privacy.'],
  ['Victor Vorski', 'on building a layered-web browser and on personal AI agents.'],
  ['Laura Sanchez', 'on measuring the societal return on AI, and her civic projects.'],
  ['Renad Baomar', '(Oman) co-editor of DP10 Education.'],
  ['Leandra (Lela) Preston', '(University of Central Florida) co-editor and steering committee member.'],
  ['Phahsa Ras', 'steering committee member, focused on DP4 Data Sovereignty.'],
  ['Lord M.E.G.A Zion', 'co-editor of DP12; reflections on the work and on connection.'],
  ['Darrell Duane', 'a newcomer, on coherence, contribution accounting and the D-Web.'],
  ['Michelle Thuo', '(Nairobi) steering committee member and coordinator of DP11.'],
  ['Micah Nyatindo', '(Nairobi) co-editor of DP15, on an early-warning layer.'],
  ['Salwa El Mais', '(Lebanon) co-editor of DP10, on making information accessible to everyone.'],
];

const CHAPTER_GROUPS: Array<[string, string]> = [
  ['DP1–6, agency and foundation', 'federated authentication and accountability, participant agency, adaptive governance, data sovereignty and privacy, decentralized namespace, commerce.'],
  ['DP7–12, communities and AI', 'simplicity and interoperability, meta-communities, developer and community incentives, education, safe and ethical AI, community-based AI governance.'],
  ['DP13–18, trust over time', 'AI containment, trust and transparency, security and provenance, roadmap, financial sustainability, feedback loops and reputation.'],
  ['DP19–24, participation and resilience', 'amplifying presence, community ownership, multimodal interaction, civic memory, universal participation and linguistic interoperability, and cross-layer resilience and compromise containment (DP24, the newest chapter).'],
];

const QA: Array<{ q: string; who: string; a: string[] }> = [
  {
    q: 'Is the book what we would build if we could design the web from the start?',
    who: 'Sandra Ponce de Leon',
    a: [
      'Daveed: in a sense, yes. We can’t start again, but the space above the page is a new beginning. Unlike projects that walk away from today’s web, the layered web keeps it as its address book. A page stops being the start and end of the conversation and becomes the place where information, interactions and experiences can build up over years.',
      'Kevin Clark added that, in company terms, the book is the first requirements document for something that has so far just evolved; from here it can evolve on purpose. Daveed called the Desirable Properties “meta-requirements”: some are true requirements, and much of the rest is context around them.',
    ],
  },
  {
    q: 'How does the meta-layer reach people? A browser plug-in?',
    who: 'Markabadi, prompted by Victor Vorski in chat',
    a: [
      'Daveed: today it works through a browser extension, or through a web embed, a few lines of code a site adds so its visitors get the same features without installing anything. The next step is a browser built on open-source Chromium, probably on mobile first.',
      'Victor: build it so the web’s millions of sites don’t have to cooperate. “It’s my account, it’s my browser.” With the open Chrome engine and AI coding, it can be done on a modest engineering budget.',
    ],
  },
  {
    q: 'Can Canopi let me comment on or patch someone else’s website?',
    who: 'Markabadi',
    a: [
      'Yes. The extension works on any web page. You can suggest patches and inserts anywhere, and it is up to the site’s owner whether to take them. Sites in the network can hide posts from their default view, but for transparency hidden posts can still be found, along with what was hidden.',
    ],
  },
  {
    q: 'Can I browse without others seeing me?',
    who: 'Markabadi',
    a: ['Yes. You only appear on a page if you switch visibility on. If you are invisible, nobody knows you visited.'],
  },
];

const VOICES: Array<[string, string]> = [
  ['Nada El Mais', 'Lecturer whose PhD is on women in AI and STEM, and president of a non-profit for women and youth. DP18 moved her because it tackles reputation loops, and the way people get trapped in old contexts, in a “brave” new way that keeps the human factor. Daveed noted that Nada and her sister Salwa have contributed consistently for a year, and floated a future “Metalayer Lebanon”.'],
  ['Victor Vorski', 'We are all becoming hybrid, each with a personal agent, and teams and organisations will have agents too. That break is an opening, and the layered web could be a good way to bring agents in.'],
  ['Laura Sanchez', 'Her insert in the community-governed AI chapter is on measuring societal return on investment. She described Our Ascent Live, a citizen-led, AI-enhanced civic broadcast, and a proposed citizens’ “fourth branch of government”. The layered web, she said, could hold shared knowledge, evidence, decisions and even disagreements.'],
  ['Renad Baomar', 'Founder of Brave Voices and co-editor of DP10 Education. “Information is not the same as knowledge, and knowledge is not the same as understanding.” She wants every learner treated as a contributor, connecting across disciplines and countries, and youth participation to go beyond consultation.'],
  ['Leandra (Lela) Preston', 'Professor of women’s and gender studies at the University of Central Florida, co-editor of DP2, DP18 and DP23, and on the steering committee. She found the AI-assisted editing more trustworthy the more she used it. She is in talks about how UCF could support the project, and her girl-studies class already works with Renad’s non-profit.'],
  ['Phahsa Ras', 'Focused on DP4 Data Sovereignty and the attention economy. Innovation is outpacing community and humanity; people need systems that let them communicate safely. Real-world applications will draw on many Desirable Properties, so feedback should be recorded and measured. Thanked Sara, Melinda, Josh and the DP4 team.'],
  ['Lord M.E.G.A Zion', 'We are building not just tomorrow but a lasting legacy, like founders setting laws, now for the digital realm. He called for real human connection as we build: “This place is a magnet.”'],
  ['Darrell Duane', 'Works on coherence and community organizing, with a D-Web background. The Desirable Properties remind him of the Sustainable Development Goals, or the Inner Development Goals, for tech. He is interested in accounting for contributions, a natural fit for DP18, and expects the D-Web community to “eat this up”.'],
  ['Michelle Thuo', 'Software engineer, internet governance advocate and AI safety researcher in Nairobi. Coordinated DP11 and, as steering, reviewed seven chapters. Proposals were weighed, not rubber-stamped: some accepted as written, some reworked, some set aside for 1.1. Next comes putting the Desirable Properties into practice where resources and infrastructure are limited.'],
  ['Micah Nyatindo', 'Designer and founder of Traffic Sync Design in Nairobi. After the Nairobi floods he started building an early-warning meta-layer; a working demo in Canopi shows simulated alerts with their source, trust indicators, status and recommended actions. Next he wants to connect real data.'],
  ['Salwa El Mais', 'DP10 stands out for making relevant information accessible to everyone, free and for a lifetime.'],
];

const CHAT_LINKS: Array<[string, string, string]> = [
  ['The Social Deck: Trust as Infrastructure', 'https://app.notion.com/p/trustasinfrastructure/The-Social-Deck-3238a748e9aa80c3a396d67559195035', 'Gael Van Weyenbergh'],
  ['Community Climate Clubs', 'https://communityclimateclubs.notion.site/', 'Gael Van Weyenbergh'],
  ['IGF 2026, Nairobi', 'https://www.igf2026.ke/', 'Gael Van Weyenbergh'],
  ['Our Ascent Live', 'https://ourascentlive.my.canva.site/our-ascent-live', 'Laura Sanchez'],
  ['ThisIsKeisha.com', 'https://www.ThisIsKeisha.com', 'Keisha Williams'],
  ['allisongustavson.com', 'https://allisongustavson.com', 'Allison Gustavson'],
  ['Suzanne Dumouchel on Substack', 'https://substack.com/@suzannedumouchel', 'Suzanne Dumouchel'],
];

type Paragraph = { t: number; speaker: string; text: string };
type Chapter = { t: number; title: string };

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-24">
      <h2 id={`${id}-heading`} className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">
        {title}
      </h2>
      <div className="mt-5 space-y-4 text-base leading-relaxed text-slate-300 sm:text-lg">{children}</div>
    </section>
  );
}

function SeekButton({ t, label }: { t: number; label?: string }) {
  const clock = videoClock(t);
  return (
    <button
      type="button"
      data-seek={Math.floor(t)}
      className="rounded font-mono text-sm tabular-nums text-cyan-300 hover:text-cyan-200 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
      aria-label={`Play from ${clock}${label ? `: ${label}` : ''}`}
    >
      {clock}
    </button>
  );
}

/** Group transcript paragraphs under the video's chapters. */
function byChapter(chapters: Chapter[], paragraphs: Paragraph[]) {
  return chapters.map((chapter, i) => {
    const end = chapters[i + 1]?.t ?? Infinity;
    return { chapter, paragraphs: paragraphs.filter((p) => p.t >= chapter.t - 0.5 && p.t < end - 0.5) };
  });
}

export default function V1LaunchEventPage() {
  const { chapters, paragraphs, video } = transcript as {
    chapters: Chapter[];
    paragraphs: Paragraph[];
    video: { youtubeId: string; duration: number };
  };
  const durationLabel = videoClock(video.duration);
  const groups = byChapter(chapters, paragraphs);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-sm">
        <Link href="/events" className="text-cyan-300 hover:text-cyan-200">
          ← Events
        </Link>
      </p>

      <header className="mt-6">
        <p className="text-sm font-medium uppercase tracking-[0.15em] text-cyan-400">
          {DATE_LABEL} · Zoom
        </p>
        <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">{TITLE}</h1>
        <p className="mt-4 text-lg text-slate-400">
          The launch of <em>The Layered Web: The Desirable Properties of a Meta-Layer</em>, Version 1.0. The
          recording below is edited for clarity ({durationLabel}). It is followed by a summary and the full
          transcript.
        </p>
      </header>

      <div className="mt-8">
        <V1LaunchPlayer
          videoId={V1_LAUNCH_YOUTUBE_ID}
          title={V1_LAUNCH_VIDEO_TITLE}
          poster={V1_LAUNCH_POSTER}
          durationLabel={durationLabel}
        />
      </div>

      <nav aria-label="Book links" className="mt-8">
        <ul className="grid gap-3 sm:grid-cols-2">
          {LINKS.map((link) => {
            const external = link.href.startsWith('http');
            const className =
              'flex h-full flex-col rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 no-underline transition hover:border-cyan-800/60';
            const body = (
              <>
                <span className="font-semibold text-white">{link.label} →</span>
                <span className="mt-0.5 break-words text-sm text-slate-400">{link.note}</span>
              </>
            );
            return (
              <li key={link.href}>
                {external ? (
                  <a href={link.href} className={className}>
                    {body}
                  </a>
                ) : (
                  <Link href={link.href} className={className}>
                    {body}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <details className="mt-8 rounded-xl border border-slate-800 bg-slate-900/40">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-200 hover:bg-slate-900/60">
          Chapters ({chapters.length})
        </summary>
        <ol className="space-y-1.5 px-4 pb-4 pt-1">
          {chapters.map((c) => (
            <li key={c.t} className="flex gap-3 text-sm text-slate-300">
              <span className="w-16 shrink-0 text-right">
                <SeekButton t={c.t} label={c.title} />
              </span>
              <span>{c.title}</span>
            </li>
          ))}
        </ol>
      </details>

      <div className="mt-14 space-y-14">
        <Section id="summary" title="In short">
          <p>
            Version 1.0 of the book is out: 807 pages and 24 chapters, each one a “desirable property” of the layered
            web, with a foreword by Vint Cerf. Its Acknowledgements name 72 contributors. You can{' '}
            <a href="https://book.desirableproperties.org" className="text-cyan-300 hover:text-cyan-200">
              read it online
            </a>
            , and the book and launch PDF are at{' '}
            <Link href="/v1" className="text-cyan-300 hover:text-cyan-200">
              desirableproperties.org/v1
            </Link>
            .
          </p>
          <p>
            Work on Version 1.1 started at the launch. The project is looking for new contributions, co-editors, and
            members for the 1.1 steering committee:{' '}
            <Link href="/improve" className="text-cyan-300 hover:text-cyan-200">
              desirableproperties.org/improve
            </Link>
            .
          </p>
          <p className="text-sm text-slate-500">
            Hosted by Daveed Benjamin (founder, Meta-Layer Initiative and Bridgit.io). 10:00–11:20 a.m. Pacific
            Time, 26 participants.
          </p>
        </Section>

        <Section id="speakers" title="Who spoke">
          <ul className="list-disc space-y-1.5 pl-5">
            {SPEAKERS.map(([name, role]) => (
              <li key={name}>
                <strong className="text-white">{name}</strong>: {role}
              </li>
            ))}
          </ul>
        </Section>

        <Section id="presentation" title="From the presentation">
          <h3 className="text-xl font-semibold text-white">What the book is</h3>
          <p>
            A community-written “North Star” for an open, trustworthy and safe layered web: the space above today’s
            web pages, where people can add information, conversation and services on top of any page. The work
            began with the Meta-Layer Initiative kickoff on 16 September 2024.
          </p>

          <h3 className="pt-2 text-xl font-semibold text-white">How it was made</h3>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Input came in three rounds: two Calls for Input (2024 and 2025), then the Desirable Properties Challenge.</li>
            <li>Each chapter had co-editors, and a proposal needed two of their votes to move forward.</li>
            <li>
              The book was frozen on Monday 9 November at 7 p.m. Pacific, after a four-hour extension. The steering
              committee then finalised it in a series of sprints.
            </li>
            <li>
              1,635 proposals were decided in all: 355 community proposals reviewed in the open (237 of them from 57
              community contributors), plus 1,280 editorial repairs the steering committee made after the freeze.
            </li>
            <li>
              Daveed reported 37 proposals deferred to Version 1.1, 39 declined and 28 withdrawn.
            </li>
            <li>
              Every decision can be traced on the site: who submitted what, who approved it, and what made the book,
              was deferred or was declined.{' '}
              <Link href="/steering" className="text-cyan-300 hover:text-cyan-200">
                See how 1.0 was decided
              </Link>
              .
            </li>
          </ul>

          <h3 className="pt-2 text-xl font-semibold text-white">What’s in the box</h3>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>An online reader, a launch PDF, and the evidence trail behind every decision.</li>
            <li>
              Front matter: the cover, the foreword by Vint Cerf, a note on the book as a “digital monument”, the
              Acknowledgements and an Introduction, which mentions Douglas Engelbart.
            </li>
            <li>
              Most chapters are already inscribed on Bitcoin as “reality anchors”: permanent, linkable texts the
              field can orient around. The live versions, with images and all approved proposals, are to be
              inscribed next.
            </li>
            <li>
              24 chapters in four groups:
              <ul className="mt-1.5 list-[circle] space-y-1 pl-5">
                {CHAPTER_GROUPS.map(([group, list]) => (
                  <li key={group}>
                    <strong className="text-white">{group}</strong>: {list}
                  </li>
                ))}
              </ul>
            </li>
          </ul>

          <h3 className="pt-2 text-xl font-semibold text-white">The name</h3>
          <p>
            The working title was <em>The Desirable Properties of a Meta-Layer</em>, and people kept asking whether it
            had something to do with Meta, or what a meta-layer even was. Kevin Clark suggested “the layered web” as a
            name people could understand on first contact. As Daveed now frames it, the <strong>layered web</strong> is
            the whole thing, today’s content web included; the <strong>meta-web</strong> or{' '}
            <strong>meta-layer</strong> is the space above the page; and the <strong>Overweb</strong> is the first full
            build of these ideas.
          </p>

          <h3 className="pt-2 text-xl font-semibold text-white">How to take part</h3>
          <p>
            Read a chapter, test its assumptions and join the conversation. If something is missing, add an{' '}
            <strong>insert</strong>. If something should change, submit a <strong>patch</strong>. Contributions made
            now can go into Version 1.1.
          </p>

          <h3 className="pt-2 text-xl font-semibold text-white">Canopi demo</h3>
          <p>
            The conversation about the book happens in the book. Canopi is a sidebar that changes with the page you
            are on. In it you can like, bookmark, reply to and quote posts; select a sentence or passage and attach a
            post, a patch or an insert to it; see who has chosen to be visible on a page and add them as a friend; and
            use rooms and the page’s AI assistant, or bring your own.
          </p>
        </Section>

        <Section id="qa" title="Questions and answers">
          {QA.map((item) => (
            <div key={item.q}>
              <h3 className="font-semibold text-white">
                {item.q} <span className="font-normal text-slate-500">({item.who})</span>
              </h3>
              {item.a.map((para) => (
                <p key={para.slice(0, 40)} className="mt-2">
                  {para}
                </p>
              ))}
            </div>
          ))}
        </Section>

        <Section id="voices" title="Community voices">
          <ul className="space-y-3">
            {VOICES.map(([name, text]) => (
              <li key={name}>
                <strong className="text-white">{name}.</strong> {text}
              </li>
            ))}
          </ul>
        </Section>

        <Section id="next" title="Announcements and next steps">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong className="text-white">Version 1.0 is published</strong> (soft launch, 13 November).
            </li>
            <li>
              <strong className="text-white">Version 1.1 is under way.</strong> Daveed hopes to finish it within about
              a month. It takes up the 37 deferred proposals and anything new that comes in.{' '}
              <Link href="/improve" className="text-cyan-300 hover:text-cyan-200">
                Contribute, co-edit a chapter or join steering
              </Link>
              .
            </li>
            <li>
              <strong className="text-white">The 1.1 steering committee is open to new members.</strong> It takes the
              body of proposals and turns it into a finished version.
            </li>
            <li>
              <strong className="text-white">A possible chapter on real-world applications or case studies.</strong>{' '}
              Applications span several Desirable Properties at once, so they may need their own chapter; the 1.1
              steering committee will consider it.
            </li>
            <li>
              <strong className="text-white">Governance.</strong> The launch was followed by a meeting on Monday 16
              November on how the Desirable Properties are governed: a possible council, and the contribution,
              co-editor and steering processes.
            </li>
            <li>
              <strong className="text-white">Community follow-ups</strong> raised on the call and in chat: a
              participants’ WhatsApp group and a book club, a bridge to the D-Web community through Darrell Duane, a
              UCF collaboration with Lela Preston, and Micah Nyatindo’s early-warning demo moving to real data.
            </li>
          </ul>
        </Section>

        <Section id="chat" title="From the chat">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              Allison Gustavson proposed a WhatsApp group for participants, with support from several others, and a
              book club that reads a chapter or two at a time. Z Johnson agreed that live conversation surfaces
              people’s expertise in a way async comments can’t, and that “including a variety of case studies will
              help people orient to what the potential of the Layered Web is.”
            </li>
            <li>
              Victor Vorski: now that software is easy to build and the world is polarised, “trust is going to become
              the key differentiator… the new moat is relationships, trust.”
            </li>
            <li>Sandra Ponce de Leon: “intentional and inspired design for information and knowledge.”</li>
            <li>
              Gael Van Weyenbergh and Michelle Thuo will both be at IGF 2026 in Nairobi.
            </li>
          </ul>
          <h3 className="pt-2 font-semibold text-white">Links shared</h3>
          <ul className="list-disc space-y-1.5 pl-5">
            {CHAT_LINKS.map(([label, href, who]) => (
              <li key={href}>
                <a href={href} className="break-words text-cyan-300 hover:text-cyan-200" rel="noopener noreferrer">
                  {label}
                </a>{' '}
                <span className="text-slate-500">({who})</span>
              </li>
            ))}
          </ul>
        </Section>

        <section id="transcript" aria-labelledby="transcript-heading" className="scroll-mt-24">
          <h2 id="transcript-heading" className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">
            Transcript
          </h2>
          <p className="mt-4 text-sm text-slate-400">
            Transcript of the edited video, from Zoom’s automatic captions. Spelling of names and terms is corrected
            where the recording is clear; the words are otherwise as spoken. Select a timestamp to play from that
            point.{' '}
            <a href={V1_LAUNCH_TRANSCRIPT_VTT} download className="text-cyan-300 hover:text-cyan-200">
              Download captions (WebVTT)
            </a>
          </p>
          <details className="mt-5 rounded-xl border border-slate-800 bg-slate-900/40">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-200 hover:bg-slate-900/60">
              Show the full transcript ({durationLabel})
            </summary>
            <div className="space-y-10 px-4 pb-6 pt-2 sm:px-6">
              {groups.map(({ chapter, paragraphs: paras }) => (
                <div key={chapter.t}>
                  <h3 className="text-lg font-semibold text-white">
                    <SeekButton t={chapter.t} label={chapter.title} />{' '}
                    <span className="ml-1">{chapter.title}</span>
                  </h3>
                  <div className="mt-3 space-y-4">
                    {paras.map((p) => (
                      <p key={p.t} className="text-base leading-relaxed text-slate-300">
                        <span className="mr-2 inline-flex gap-2 align-baseline">
                          <SeekButton t={p.t} />
                          <strong className="text-slate-100">{p.speaker}:</strong>
                        </span>
                        {p.text}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </section>
      </div>
    </main>
  );
}
