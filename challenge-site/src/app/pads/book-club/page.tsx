import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import PadInvite from '@/components/pads/PadInvite';
import NextSessionProposals from '@/components/sessions/NextSessionProposals';
import SessionAskDeepi from '@/components/sessions/SessionAskDeepi';
import SessionChat from '@/components/sessions/SessionChat';
import {
  BOOK_CLUB,
  BOOK_CLUB_PATH,
  bookClubChatSlug,
  bookClubHref,
  bookClubPhase,
  bookClubProposalKey,
  currentBookClubMeeting,
  findBookClubMeeting,
  type BookClubLink,
  type BookClubMeeting,
  type BookClubPhase,
} from '@/data/book-club';
import { publicBase } from '@/lib/pads/pad-email.server';
import { fetchBookClubBadge } from '@/lib/pads/book-club-badge.server';
import { bookClubInviteFor } from '@/lib/pads/pad-invite.server';
import { readProposalsView } from '@/lib/next-proposals/store.server';
import { SITE_NAME } from '@/lib/site-metadata';

/** Per request: what sits at the top depends on the clock (before, during, after the meeting). */
export const dynamic = 'force-dynamic';

const DESCRIPTION =
  'The Overweb Book Club reads The Layered Web together, a book written in the open by 70+ people. The reading, the meeting, its summary, proposals, votes and chat, on one pad.';

export const metadata: Metadata = {
  title: `${BOOK_CLUB.title} | ${SITE_NAME}`,
  description: DESCRIPTION,
  alternates: { canonical: BOOK_CLUB_PATH },
  openGraph: { type: 'website', siteName: SITE_NAME, title: BOOK_CLUB.title, description: DESCRIPTION, url: BOOK_CLUB_PATH },
  twitter: { card: 'summary', title: BOOK_CLUB.title, description: DESCRIPTION },
};

const linkClass = 'text-cyan-300 hover:text-cyan-200';
const h2Class = 'border-b border-slate-700 pb-2 text-2xl font-bold text-white';

function whenLabel(m: BookClubMeeting): string {
  const d = new Date(m.startsAt);
  const day = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Los_Angeles' });
  const pt = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' });
  const utc = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  return `${day}, ${pt} Pacific (${utc} UTC), ${m.durationMin} minutes`;
}

function shortDate(m: BookClubMeeting): string {
  return new Date(m.startsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'America/Los_Angeles' });
}

function Links({ items }: { items: BookClubLink[] }) {
  return (
    <ul className="mt-3 space-y-2">
      {items.map((l) => (
        <li key={l.href} className="text-base leading-relaxed">
          <a href={l.href} className={linkClass}>
            {l.label}
          </a>
          {l.note ? <span className="text-slate-400"> · {l.note}</span> : null}
        </li>
      ))}
    </ul>
  );
}

function Section({ id, title, children, tone = 'plain' }: { id: string; title: string; children: ReactNode; tone?: 'plain' | 'feature' }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className={
        tone === 'feature'
          ? 'scroll-mt-24 rounded-2xl border border-cyan-500/60 bg-cyan-950/30 px-5 py-5 sm:px-6'
          : 'scroll-mt-24'
      }
    >
      <h2 id={`${id}-heading`} className={tone === 'feature' ? 'text-2xl font-bold text-white' : h2Class}>
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

const PHASE_LABEL: Record<BookClubPhase, string> = {
  before: 'Coming up',
  during: 'Happening now',
  after: 'Done',
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function BookClubPadPage({ searchParams }: Props) {
  const params = await searchParams;
  const now = new Date();
  const meetings = [...BOOK_CLUB.meetings].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const asked = typeof params.m === 'string' ? params.m : null;
  const meeting = findBookClubMeeting(meetings, asked) ?? currentBookClubMeeting(meetings, now);
  if (!meeting) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 text-slate-200">
        <h1 className="text-3xl font-bold text-white">{BOOK_CLUB.title}</h1>
        <p className="mt-4">The first meeting is not scheduled yet.</p>
      </main>
    );
  }
  const phase = bookClubPhase(meeting, now);
  const pagePath = bookClubHref(meeting.id);
  const proposalKey = bookClubProposalKey(meeting.id);
  const [proposals, liveBadge] = await Promise.all([
    readProposalsView(proposalKey).catch(() => null),
    fetchBookClubBadge(BOOK_CLUB.badge.govHubLayer, BOOK_CLUB.badge.govHubPad, meeting.id),
  ]);
  const invite = bookClubInviteFor(BOOK_CLUB_PATH, now);
  const signInHref = `/login?next=${encodeURIComponent(`${pagePath}#proposals`)}`;
  const next = meetings.find((m) => m.startsAt > meeting.startsAt && bookClubPhase(m, now) !== 'after');

  /* ---------- sections ---------- */

  const reading = (
    <Section id="reading" title={phase === 'after' ? `The reading: ${meeting.chapter}` : `Featured reading: ${meeting.chapter}`} tone={phase === 'before' ? 'feature' : 'plain'}>
      <p className="text-base leading-relaxed text-slate-200">
        {phase === 'before'
          ? `Read it before the meeting if you can, and bring a question or an insight. Everyone is welcome, whether or not you contributed to the book.`
          : `What the group read for this meeting.`}
      </p>
      <Links items={meeting.featured} />
      {meeting.prompts.length ? (
        <>
          <h3 className="mt-5 text-lg font-semibold text-white">To think about while you read</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-base leading-relaxed text-slate-200">
            {meeting.prompts.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </>
      ) : null}
    </Section>
  );

  // "Earn a badge" (owner, 25 Nov 2026; was "Extra credit"): activities live on the Gov Hub pad, where members
  // sign in, save their answers and see their own book club page. Without the Gov Hub pad, the local list shows.
  const activities = liveBadge?.activities.length
    ? liveBadge.activities
    : meeting.badgeActivities.map((a, i) => ({ id: `a${i}`, label: a.label, href: a.href ?? null, note: a.note ?? null, prompt: a.prompt ?? null }));
  const badgeName = liveBadge?.badgeName ?? BOOK_CLUB.badge.name;
  const badge = activities.length ? (
    <Section id="badge" title="Earn a badge">
      <p className="text-base leading-relaxed text-slate-200">
        {liveBadge?.intro ??
          `Complete this week’s activities to earn the ${badgeName}. Each week you complete is added to your badge.`}
      </p>
      <p className="mt-2 text-base text-slate-300">
        <span className="font-semibold text-white">{badgeName}</span> · {liveBadge?.feeNote ?? BOOK_CLUB.badge.feeNote}
      </p>
      <ol className="mt-4 list-decimal space-y-3 pl-5 text-base leading-relaxed text-slate-200">
        {activities.map((a) => (
          <li key={a.id}>
            {a.href ? (
              <a href={a.href} className={linkClass}>
                {a.label}
              </a>
            ) : (
              <span className="font-semibold text-white">{a.label}</span>
            )}
            {a.note ? <span className="text-slate-400"> · {a.note}</span> : null}
            {a.prompt ? <div className="text-sm text-slate-400">{a.prompt}</div> : null}
            {(liveBadge?.shared[a.id] ?? []).map((e) => (
              <blockquote key={`${e.name}-${e.body.slice(0, 20)}`} className="mt-2 border-l-2 border-slate-600 pl-3 text-sm text-slate-300">
                <span className="font-semibold text-slate-200">{e.name}:</span> {e.body}
                {e.linkUrl ? (
                  <>
                    {' '}
                    <a href={e.linkUrl} className={linkClass} rel="noopener noreferrer">
                      link
                    </a>
                  </>
                ) : null}
              </blockquote>
            ))}
          </li>
        ))}
      </ol>
      {liveBadge ? (
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
          <a href={liveBadge.saveUrl} className="inline-flex rounded-lg bg-cyan-300 px-5 py-2.5 font-semibold text-slate-950 no-underline hover:bg-cyan-200">
            Save your answers on Gov Hub →
          </a>
          <a href={liveBadge.myPageUrl} className={linkClass}>
            My book club page
          </a>
          {liveBadge.payUrl ? (
            <a href={liveBadge.payUrl} className={linkClass} rel="noopener noreferrer">
              {liveBadge.payLabel ?? 'Pay on Zeffy'}
            </a>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-400">Saving your answers opens on Gov Hub soon.</p>
      )}
      <p className="mt-3 text-sm text-slate-400">
        Your answers are private to you and the book club’s hosts unless you choose to show them on the pad.
      </p>
    </Section>
  ) : null;

  const join = (
    <Section id="join" title="Join the book club">
      <p className="text-base leading-relaxed text-slate-200">
        {BOOK_CLUB.cadence} Join to get each reading before the meeting.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
        {BOOK_CLUB.waitlistUrl ? (
          <a href={BOOK_CLUB.waitlistUrl} className="inline-flex rounded-lg bg-cyan-300 px-5 py-2.5 font-semibold text-slate-950 no-underline hover:bg-cyan-200">
            Join on the Overweb →
          </a>
        ) : null}
        {meeting.lumaUrl && phase !== 'after' ? (
          <a href={meeting.lumaUrl} className={BOOK_CLUB.waitlistUrl ? linkClass : 'inline-flex rounded-lg bg-cyan-300 px-5 py-2.5 font-semibold text-slate-950 no-underline hover:bg-cyan-200'} rel="noopener noreferrer">
            Register for this meeting on Luma
          </a>
        ) : null}
        {meeting.sessionHref ? (
          <Link href={meeting.sessionHref} className={linkClass}>
            Part of {meeting.sessionLabel ?? 'the session'}
          </Link>
        ) : null}
      </div>
    </Section>
  );

  const chat = (
    <SessionChat
      slug={bookClubChatSlug(meeting.id)}
      pagePath={pagePath}
      heading={phase === 'during' ? 'Book club chat: post your questions and insights now' : `Book club chat: ${meeting.chapter}`}
    />
  );

  const summary = (
    <Section id="summary" title="Meeting summary">
      {meeting.summary?.length ? (
        <>
          <p className="text-sm text-slate-400">Drafted by Claude from the meeting. Participants can correct it in the chat.</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-relaxed text-slate-200">
            {meeting.summary.map((s) => (
              <li key={s.slice(0, 40)}>{s}</li>
            ))}
          </ul>
          {meeting.decisions?.length ? (
            <>
              <h3 className="mt-5 text-lg font-semibold text-white">Decided in the meeting</h3>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-base leading-relaxed text-slate-200">
                {meeting.decisions.map((s) => (
                  <li key={s.slice(0, 40)}>{s}</li>
                ))}
              </ul>
            </>
          ) : null}
        </>
      ) : (
        <p className="text-base text-slate-300">
          {phase === 'after' ? 'The summary is being drafted and appears here soon.' : 'The summary appears here after the meeting.'}
        </p>
      )}
    </Section>
  );

  const review = (
    <Section id="review" title="Review the draft">
      {meeting.reviewDocUrl ? (
        <p className="text-base leading-relaxed text-slate-200">
          {meeting.reviewNote ?? 'Comment on anything misattributed, missing or wrong.'}{' '}
          <a href={meeting.reviewDocUrl} className={linkClass} rel="noopener noreferrer">
            Open the review draft
          </a>
          .
        </p>
      ) : (
        <p className="text-base text-slate-300">
          {phase === 'after' ? 'The review draft opens here once the summary is ready.' : 'After the meeting, a draft opens here for review.'}
        </p>
      )}
    </Section>
  );

  const proposalBox = (
    <section id="proposals" aria-labelledby="proposals-heading" className="scroll-mt-24">
      <h2 id="proposals-heading" className={h2Class}>
        Proposals
      </h2>
      <p className="mt-3 text-base leading-relaxed text-slate-300">
        Something the club should discuss or decide, or a change to the book that came out of the reading. Proposals for
        this meeting close when it starts.
        {phase !== 'before' && next ? (
          <>
            {' '}
            <Link href={bookClubHref(next.id, 'proposals')} className={linkClass}>
              Propose for the next meeting ({next.chapter}, {shortDate(next)})
            </Link>
            .
          </>
        ) : null}
      </p>
      <div className="mt-4">
        <NextSessionProposals
          date={proposalKey}
          initial={proposals}
          signInHref={signInHref}
          variant="list"
          sessionLabel={`the ${shortDate(meeting)} book club`}
        />
      </div>
    </section>
  );

  const votes = (
    <Section id="votes" title="Votes">
      {meeting.votes?.length ? (
        <ul className="space-y-3">
          {meeting.votes.map((v) => (
            <li key={v.question} className="text-base leading-relaxed text-slate-200">
              <span className="font-semibold text-white">{v.question}</span>
              {v.outcome ? <span className="text-slate-300"> · {v.outcome}</span> : null}
              {v.href ? (
                <>
                  {' '}
                  <a href={v.href} className={linkClass}>
                    Details
                  </a>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-base text-slate-300">No votes for this meeting.</p>
      )}
    </Section>
  );

  const inviteBox = invite ? (
    <section id="invite" aria-labelledby="invite-heading" className="scroll-mt-24">
      <h2 id="invite-heading" className={h2Class}>
        Invite others
      </h2>
      <div className="mt-4">
        <PadInvite content={invite} base={publicBase()} />
      </div>
    </section>
  ) : null;

  const askDeepi = (
    <SessionAskDeepi
      slug={bookClubChatSlug(meeting.id)}
      title={`Ask Deepi about ${meeting.chapter}`}
      blurb="Deepi knows the book. Ask about this reading, or what other chapters say about it. Answers can be wrong: check the book."
      context={{
        title: `${BOOK_CLUB.title}: ${meeting.chapter}`,
        text: [
          `Book club on ${BOOK_CLUB.book}. This meeting reads: ${meeting.chapter} (${meeting.featured.map((f) => f.label).join(', ')}).`,
          `Page: https://desirableproperties.org${pagePath}`,
          'Help the reader understand and discuss this reading. Quote the book where you can and say where in the book. Say so when you do not know.',
          ...(meeting.prompts.length ? ['Prompts for the group:', ...meeting.prompts.map((p) => `- ${p}`)] : []),
          ...(meeting.summary?.length ? ['Meeting summary:', ...meeting.summary.map((s) => `- ${s}`)] : []),
        ].join('\n'),
      }}
      starterPrompts={[
        `Summarise ${meeting.chapter} in five lines`,
        `What is the strongest objection to ${meeting.chapter}?`,
        'Give me a question to bring to the group',
      ]}
    />
  );

  // Order by phase (owner, 25 Nov 2026): reading on top before; chat on top during; summary on top after, reading lower.
  // "Earn a badge" follows the reading before and during, and the review after.
  const order: (ReactNode | null)[] =
    phase === 'before'
      ? [reading, badge, join, proposalBox, askDeepi, chat, votes, inviteBox]
      : phase === 'during'
        ? [chat, reading, badge, askDeepi, proposalBox, join]
        : [summary, review, badge, proposalBox, votes, reading, inviteBox, chat, askDeepi, join];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-slate-200 sm:py-12">
      <p className="text-sm">
        <Link href="/pads" className={linkClass}>
          Pads
        </Link>{' '}
        <span className="text-slate-500">/</span> <span className="text-slate-300">Book club</span>
      </p>
      <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">{BOOK_CLUB.title}</h1>
      <p className="mt-2 text-base leading-relaxed text-slate-300">
        Reading <em>{BOOK_CLUB.book}</em> together, a book written in the open by 70+ people.
      </p>

      <nav aria-label="Choose a reading" className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Chapter</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {meetings.map((m) => {
            const on = m.id === meeting.id;
            return (
              <Link
                key={m.id}
                href={bookClubHref(m.id)}
                aria-current={on ? 'page' : undefined}
                className={`rounded-full border px-3 py-1.5 text-sm no-underline ${
                  on ? 'border-cyan-400 bg-cyan-400/15 text-white' : 'border-slate-700 text-slate-200 hover:border-cyan-500'
                }`}
              >
                {m.chapter} · {shortDate(m)}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
        <p className="text-sm">
          <span
            className={`mr-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
              phase === 'during' ? 'bg-emerald-400 text-slate-950' : phase === 'before' ? 'bg-cyan-300 text-slate-950' : 'bg-slate-600 text-white'
            }`}
          >
            {PHASE_LABEL[phase]}
          </span>
          <span className="text-slate-200">{whenLabel(meeting)}</span>
        </p>
      </div>

      <div className="mt-10 space-y-12">
        {order.map((node, i) => (node ? <div key={i}>{node}</div> : null))}
      </div>
    </main>
  );
}
