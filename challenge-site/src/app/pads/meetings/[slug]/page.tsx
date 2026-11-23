import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PadChat from '@/components/pads/PadChat';
import PadInvite from '@/components/pads/PadInvite';
import { getMeetingPad } from '@/data/meeting-pads';
import { getMeetingPadTranscript } from '@/data/meeting-pads/transcripts';
import { meetingPadServable } from '@/lib/meeting-pads/flag';
import {
  FOLLOW_UP_STATUS_LABEL,
  isMeetingPadPublic,
  MEETING_PAD_STATUS_LABEL,
  meetingPadChatContext,
  meetingPadCounts,
  meetingPadHref,
  type MeetingPadItem,
  type MeetingPadItemStatus,
  type MeetingPadLink,
} from '@/lib/meeting-pads/types';
import { publicBase } from '@/lib/pads/pad-email.server';
import { meetingInviteFor } from '@/lib/pads/pad-invite.server';
import { pageOpenGraph } from '@/lib/site-metadata';

/**
 * Meeting pad: one durable page per meeting, with a synthesis, a tracker, follow-ups, an invite panel and a chat.
 * A public pad (isMeetingPadPublic: visibility 'public' and every non-host participant consented) is served
 * everywhere, indexable, with no preview banner. Any other pad is a preview (src/lib/meeting-pads/flag.ts): a 404
 * unless MEETING_PADS_PREVIEW=on outside production, always noindex, and not linked from anywhere public. Rendered
 * per request so the flag is read at runtime, not baked in at build time.
 */
export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;

const NOINDEX = { index: false, follow: false, nocache: true } as const;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const found = getMeetingPad(slug);
  const pad = found && meetingPadServable(found) ? found : null;
  if (!pad) return { title: 'Not found | Desirable Properties', robots: NOINDEX };
  if (isMeetingPadPublic(pad)) {
    const path = meetingPadHref(pad.slug);
    const title = `${pad.dateLabel} · ${pad.title}`;
    return {
      title: `${title} | Meeting pad | Desirable Properties`,
      description: pad.inviteSummary,
      alternates: { canonical: path },
      openGraph: pageOpenGraph({ title: `Meeting pad: ${title}`, description: pad.inviteSummary, path }),
    };
  }
  return {
    title: `${pad.dateLabel} · ${pad.title} | Meeting pad (preview)`,
    description: pad.inviteSummary,
    robots: NOINDEX,
  };
}

const STATUS_TONE: Record<MeetingPadItemStatus, string> = {
  built: 'border-emerald-600/80 bg-emerald-950/30 text-emerald-200',
  planned: 'border-sky-600/80 bg-sky-950/30 text-sky-200',
  to_decide: 'border-amber-600/80 bg-amber-950/30 text-amber-200',
  kept: 'border-slate-600 bg-slate-900/40 text-slate-300',
};

function shortDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="scroll-mt-24 border-t border-slate-800 pt-6">
      <h2 id={id} className="text-xl font-bold text-white">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function StatusBadge({ status }: { status: MeetingPadItemStatus }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded border px-2 py-0.5 text-xs font-medium ${STATUS_TONE[status]}`}>
      {MEETING_PAD_STATUS_LABEL[status]}
    </span>
  );
}

function LinkOut({ link }: { link: MeetingPadLink }) {
  const external = /^https?:\/\//.test(link.href);
  return external ? (
    <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:text-cyan-200">
      {link.label}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  ) : (
    <Link href={link.href} className="text-cyan-300 hover:text-cyan-200">
      {link.label}
    </Link>
  );
}

function TrackerItem({ item }: { item: MeetingPadItem }) {
  return (
    <li id={`item-${item.n}`} className="scroll-mt-24 rounded-lg border border-slate-800 bg-slate-900/30 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono text-xs text-slate-500">#{item.n}</span>
        <StatusBadge status={item.status} />
        <span className="text-xs text-slate-500">
          {shortDate(item.statusDate)} · at {item.at} in the call
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-100">{item.raised}</p>
      {item.quote ? (
        <blockquote className="mt-2 border-l-2 border-slate-600 pl-3 text-sm italic leading-relaxed text-slate-300">
          “{item.quote.text}”
          <footer className="mt-0.5 text-xs not-italic text-slate-500">
            {item.quote.by}, at {item.quote.at}
          </footer>
        </blockquote>
      ) : null}
      <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
        <span className="font-medium text-slate-400">Response: </span>
        {item.response}
      </p>
      {item.note || item.links?.length ? (
        <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
          {item.note ? <span>{item.note}</span> : null}
          {item.links?.map((l) => <LinkOut key={l.href} link={l} />)}
        </p>
      ) : null}
    </li>
  );
}

export default async function MeetingPadPage({ params }: { params: Params }) {
  const { slug } = await params;
  const pad = getMeetingPad(slug);
  if (!pad || !meetingPadServable(pad)) notFound();
  const isPublic = isMeetingPadPublic(pad);
  const path = meetingPadHref(pad.slug);
  const invite = meetingInviteFor(path);
  const counts = meetingPadCounts(pad);
  const total = pad.groups.reduce((n, g) => n + g.items.length, 0);
  // A transcript is shown only when every participant has consented (and so the pad names them all).
  const transcript = pad.participants.every((p) => p.consent === 'consented') ? getMeetingPadTranscript(pad.slug) : null;

  return (
    <main className="mx-auto w-full min-w-0 max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      {isPublic ? null : (
        <p className="mb-5 rounded-lg border border-amber-700/60 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
          Staging preview, not published. {pad.visibilityNote}
        </p>
      )}

      <nav aria-label="Breadcrumb" className="text-sm text-slate-400">
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <li>
            <Link href="/pads" className="hover:text-cyan-200">Pads</Link>
          </li>
          <li aria-hidden="true">›</li>
          <li>
            {isPublic ? (
              <Link href="/pads#meetings" className="hover:text-cyan-200">Meetings</Link>
            ) : (
              'Meetings'
            )}
          </li>
          <li aria-hidden="true">›</li>
          <li aria-current="page" className="text-slate-300">{pad.dateLabel}</li>
        </ol>
      </nav>

      <header className="mt-5 pb-6">
        <p className="text-sm font-medium text-sky-300">Meeting pad</p>
        <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
          {pad.dateLabel} · {pad.title}
        </h1>
        <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[9rem_1fr]">
          <dt className="text-slate-400">When</dt>
          <dd className="text-slate-100">
            {pad.heldLabel} · {pad.durationMinutes} min · {pad.format}
          </dd>
          <dt className="text-slate-400">Who</dt>
          <dd className="text-slate-100">{pad.participants.map((p) => `${p.shownAs} (${p.role})`).join(', ')}</dd>
          <dt className="text-slate-400">Reviewed</dt>
          <dd className="text-slate-100">
            <Link href={pad.reviewed.href} className="text-cyan-300 hover:text-cyan-200">
              {pad.reviewed.label}
            </Link>
            {pad.reviewed.note ? <span className="text-slate-400"> · {pad.reviewed.note}</span> : null}
          </dd>
          {isPublic ? (
            <>
              <dt className="text-slate-400">Consent</dt>
              <dd className="text-slate-300">{pad.visibilityNote}</dd>
            </>
          ) : null}
          <dt className="text-slate-400">Tracker</dt>
          <dd className="flex flex-wrap items-center gap-2">
            <span className="text-slate-100">{total} items:</span>
            {counts.map((c) => (
              <span key={c.status} className="inline-flex items-center gap-1 text-slate-300">
                <StatusBadge status={c.status} /> {c.count}
              </span>
            ))}
          </dd>
        </dl>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href="#tracker" className="inline-flex items-center rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:border-cyan-500">
            Tracker
          </a>
          <a href="#invite" className="inline-flex items-center rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:border-cyan-500">
            Invite others
          </a>
          <a href="#chat" className="inline-flex items-center rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:border-cyan-500">
            Ask about it
          </a>
        </div>
      </header>

      <div className="space-y-10">
        <Section id="synthesis" title="In short">
          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-base leading-relaxed text-slate-100 sm:p-5">
            {pad.synthesis.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <h3 className="mt-6 text-base font-semibold text-white">Key points</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
            {pad.keyPoints.map((k, i) => (
              <li key={i}>{k}</li>
            ))}
          </ul>
        </Section>

        <Section id="tracker" title="Tracker">
          <p className="text-sm text-slate-400">
            Built: shipped, with a link. Planned: agreed and scheduled. To decide: needs a decision first. Kept: no change wanted.
          </p>
          <div className="mt-5 space-y-8">
            {pad.groups.map((g) => (
              <div key={g.id} id={g.id} className="scroll-mt-24">
                <h3 className="text-lg font-semibold text-white">
                  {g.title} <span className="text-sm font-normal text-slate-500">({g.items.length})</span>
                </h3>
                <p className="mt-1 text-sm text-slate-400">{g.intro}</p>
                <ol className="mt-3 space-y-2">
                  {g.items.map((item) => (
                    <TrackerItem key={item.n} item={item} />
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </Section>

        <Section id="follow-ups" title={pad.followUps.title}>
          <ul className="space-y-2">
            {pad.followUps.items.map((f, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-slate-800 bg-slate-900/30 px-3 py-2 text-sm">
                <span className="rounded border border-slate-600 px-2 py-0.5 text-xs text-slate-300">{FOLLOW_UP_STATUS_LABEL[f.status]}</span>
                <span className="text-slate-100">{f.text}</span>
                {f.note ? <span className="text-xs text-slate-400">{f.note}</span> : null}
                {f.links?.length ? (
                  <span className="flex flex-wrap gap-x-3 text-xs">
                    {f.links.map((l) => <LinkOut key={l.href} link={l} />)}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>

        <Section id="next-steps" title="Next steps">
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
            {pad.nextSteps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </Section>

        {transcript ? (
          <section aria-labelledby="transcript-heading" className="border-t border-slate-800 pt-6">
            <details id="transcript" className="group scroll-mt-24">
              <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
                <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 shrink-0 text-cyan-300 transition-transform group-open:rotate-90" fill="currentColor">
                  <path d="M7 4l7 6-7 6V4z" />
                </svg>
                <h2 id="transcript-heading" className="text-xl font-bold text-white">
                  Transcript: {pad.dateLabel}, {pad.title}
                </h2>
              </summary>
              <p className="mt-3 text-sm text-slate-400">{transcript.note}</p>
              <ol className="mt-4 space-y-3">
                {transcript.turns.map((t, i) => (
                  <li key={i} className="grid gap-x-3 text-sm sm:grid-cols-[3.5rem_9rem_1fr]">
                    <span className="font-mono text-xs leading-6 text-slate-500">{t.at}</span>
                    <span className="font-medium text-slate-300">{t.speaker}</span>
                    <span className="leading-relaxed text-slate-200">{t.text}</span>
                  </li>
                ))}
              </ol>
            </details>
          </section>
        ) : null}

        {invite ? (
          <Section id="invite" title="Invite others">
            <PadInvite content={invite} base={publicBase()} />
          </Section>
        ) : null}

        <Section id="chat" title="Ask about it">
          <PadChat
            padId={pad.slug}
            dpNumber={null}
            context={meetingPadChatContext(pad)}
            contextTitle={`Meeting pad: ${pad.dateLabel} · ${pad.title}`}
            surface={`desirableproperties.org${path}`}
            intro="Ask Deepi about this meeting. It reads this pad: the summary, the tracker and the follow-ups."
            starterLabel="About this meeting"
            starters={pad.chatStarters}
          />
        </Section>
      </div>
    </main>
  );
}
