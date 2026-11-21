import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AnchorMissing, ChangeInContext } from '@/components/pads/PadChangeView';
import { PadAdvisory, PadFollowButton } from '@/components/pads/PadCommunity';
import PadCoEditorActions from '@/components/pads/PadCoEditorActions';
import PadChat from '@/components/pads/PadChat';
import PadInvite from '@/components/pads/PadInvite';
import { dpDetailHref } from '@/lib/dp-links';
import { VERSION_MARKER_LABEL } from '@/lib/dp-v11';
import { DECISION_RULE_COPY, padDecisionRule } from '@/lib/pads/pad-settings';
import { publicBase } from '@/lib/pads/pad-email.server';
import { proposalInviteFromLoaded } from '@/lib/pads/pad-invite.server';
import { GovHubUnavailableError, loadProposalPad, type LoadedPad } from '@/lib/pads/proposal-pad.server';
import {
  approvalsLine,
  fallbackTitle,
  padChatContext,
  padHref,
  STATUS_LABEL,
  type ProposalPad,
} from '@/lib/pads/proposal-pad-core';
import { pageOpenGraph } from '@/lib/site-metadata';

export const revalidate = 120;

type Params = Promise<{ id: string }>;

function shortDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso.endsWith('Z') || /[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

const STATUS_TONE: Record<string, string> = {
  pending: 'border-amber-600/80 text-amber-200',
  incorporated: 'border-emerald-600/80 text-emerald-200',
  declined: 'border-rose-700/80 text-rose-200',
  considered: 'border-slate-600 text-slate-300',
  withdrawn: 'border-slate-600 text-slate-300',
  other: 'border-slate-600 text-slate-300',
};

const RECOMMENDATION: Record<string, string> = {
  accept: 'Accept',
  decline: 'Decline',
  defer: 'Carry to Version 1.1',
  revise: 'Accept with revisions',
};

/** The pad, null when there is no such proposal, or 'unavailable' when Gov Hub did not answer. */
async function load(id: string): Promise<LoadedPad | null | 'unavailable'> {
  try {
    return await loadProposalPad(id);
  } catch (err) {
    if (err instanceof GovHubUnavailableError) return 'unavailable';
    throw err;
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const loaded = await load(id);
  if (loaded === 'unavailable') return { title: 'Proposal pad | Desirable Properties', robots: { index: false, follow: false } };
  if (!loaded) return { title: 'Proposal not found | Desirable Properties', robots: { index: false, follow: false } };
  const title = loaded.summary?.title || fallbackTitle(loaded.pad);
  const where = loaded.pad.dpId || loaded.pad.docLabel;
  const description = loaded.summary?.summary || `A proposed change to ${loaded.pad.docLabel}.`;
  return {
    title: `${title} | ${where} proposal pad`,
    description,
    alternates: { canonical: padHref(loaded.pad.id) },
    openGraph: pageOpenGraph({ title: `${where}: ${title}`, description, path: padHref(loaded.pad.id) }),
  };
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

function Changes({ pad }: { pad: ProposalPad }) {
  const hint = pad.applicability !== 'applies' ? pad.applicabilityHint : null;
  if (pad.changes.length === 1) {
    return (
      <div className="space-y-3">
        {pad.anchorGone && pad.changes[0].location ? <AnchorMissing hint={hint} /> : null}
        <ChangeInContext change={pad.changes[0]} hint={hint} />
      </div>
    );
  }
  const missing = pad.changes.filter((c) => !c.location).length;
  return (
    <div className="space-y-3">
      {pad.anchorGone ? <AnchorMissing hint={missing ? `${missing} of ${pad.changes.length} edits point at text that is not in the current chapter.` : hint} /> : null}
      <p className="text-sm text-slate-400">
        {pad.changes.length} edits, approved together. Each one is shown in its place in the chapter.
      </p>
      {pad.changes.map((c, i) => (
        <details key={i} open={i < 2} className="rounded-lg border border-slate-800 bg-slate-900/30 p-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-200">
            Edit {i + 1}
            {c.rule ? ` · ${c.rule}` : ''}
            {!c.proposed.trim() ? ' · deletion' : ''}
            {c.location?.section ? <span className="font-normal text-slate-400"> · {c.location.section}</span> : null}
            {!c.location ? <span className="font-normal text-rose-300"> · passage not found</span> : null}
          </summary>
          <div className="mt-3 space-y-2">
            {c.note ? <p className="text-sm text-slate-400">{c.note}</p> : null}
            <ChangeInContext change={c} hint={null} />
          </div>
        </details>
      ))}
    </div>
  );
}

export default async function ProposalPadPage({ params }: { params: Params }) {
  const { id } = await params;
  const loaded = await load(id);
  if (loaded === 'unavailable') {
    return (
      <main className="mx-auto w-full min-w-0 max-w-5xl px-4 py-16 sm:px-6">
        <h1 className="text-2xl font-bold text-white">Proposal pad</h1>
        <p className="mt-4 text-slate-300">Gov Hub did not answer, so this proposal could not be loaded. Reload in a minute.</p>
        <p className="mt-4">
          <Link href="/pads" className="text-cyan-300 hover:text-cyan-200">All proposal pads</Link>
        </p>
      </main>
    );
  }
  if (!loaded) notFound();
  const { pad, summary, workgroupId, workgroupSlug } = loaded;
  const title = summary?.title || fallbackTitle(pad);
  const rule = DECISION_RULE_COPY[padDecisionRule(process.env.PAD_DECISION_RULE)];
  const dpNumber = pad.dpId ? Number(pad.dpId.slice(2)) : null;
  const dpLabelTitle = pad.docLabel.replace(/^DP\d+\s*[–-]\s*/, '');
  const open = pad.status === 'pending';

  return (
    <main className="mx-auto w-full min-w-0 max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-400">
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <li>
            <Link href="/pads" className="hover:text-cyan-200">Pads</Link>
          </li>
          <li aria-hidden="true">›</li>
          <li>
            <Link href="/pads#proposals" className="hover:text-cyan-200">Proposals</Link>
          </li>
          <li aria-hidden="true">›</li>
          <li>
            {pad.dpId ? (
              <Link href={dpDetailHref(pad.dpId)} className="hover:text-cyan-200">{pad.dpId}</Link>
            ) : (
              pad.docLabel
            )}
          </li>
          <li aria-hidden="true">›</li>
          <li aria-current="page" className="font-mono text-slate-300">{pad.shortId}</li>
        </ol>
      </nav>

      <header className="mt-5 pb-6">
        <p className="text-sm font-medium text-sky-300">
          {pad.dpId ? (
            <Link href={dpDetailHref(pad.dpId)} className="hover:text-sky-200">
              {pad.dpId} · {dpLabelTitle}
            </Link>
          ) : (
            pad.docLabel
          )}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">{title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className={`rounded border px-2 py-0.5 ${STATUS_TONE[pad.status]}`}>{pad.statusLabel}</span>
          {pad.marker ? (
            <span className="rounded border border-sky-700/70 px-2 py-0.5 text-sky-200">{VERSION_MARKER_LABEL[pad.marker]}</span>
          ) : null}
          <span className="rounded border border-slate-700 px-2 py-0.5 text-slate-300">{pad.kindLabel}</span>
          {pad.anchorGone ? (
            <span className="rounded border border-rose-700/70 px-2 py-0.5 text-rose-200">Needs re-anchoring</span>
          ) : null}
          {pad.titleChange ? (
            <span className="rounded border border-violet-700/70 px-2 py-0.5 text-violet-200">Changes the chapter title</span>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
          <div>
            <p className="text-base font-semibold text-white">{approvalsLine(pad.approvals.length, pad.approvalsNeeded)}</p>
            <p className="text-sm text-slate-400">
              {open
                ? pad.approvals.length
                  ? `So far: ${pad.approvals.map((a) => a.name).join(', ')}. ${pad.approvalsNeeded - pad.approvals.length > 0 ? `${pad.approvalsNeeded - pad.approvals.length} more incorporates it.` : ''}`
                  : `${pad.approvalsNeeded} co-editor approvals incorporate it.`
                : `This proposal is ${STATUS_LABEL[pad.status].toLowerCase()}.`}
              {pad.titleChange ? ' A steering member must also agree to the title change.' : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
            <PadFollowButton padId={pad.id} ml={pad.mlNumber} />
            <a href="#invite" className="inline-flex items-center rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:border-cyan-500">
              Invite others
            </a>
          </div>
        </div>
      </header>

      <div className="space-y-10">
        <Section id="plain" title="In plain terms">
          {summary ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
              <p className="text-base leading-relaxed text-slate-100">{summary.summary}</p>
              <p className="mt-3 text-xs text-slate-500">
                Plain-language summary, AI-generated; the proposal text below is authoritative.
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No plain-language summary yet. The proposal text below is authoritative.</p>
          )}
        </Section>

        <Section id="change" title="The change">
          <Changes pad={pad} />
        </Section>

        <Section id="record" title="The record">
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[10rem_1fr]">
            <dt className="text-slate-400">Proposed by</dt>
            <dd className="text-slate-100">{pad.authorName}</dd>
            <dt className="text-slate-400">Filed</dt>
            <dd className="text-slate-100">
              {shortDate(pad.createdAt)}
              {pad.createdOnRevisionLabel ? <span className="text-slate-400"> · on {pad.createdOnRevisionLabel}</span> : null}
            </dd>
            <dt className="text-slate-400">Chapters it touches</dt>
            <dd className="flex flex-wrap gap-1.5">
              {pad.dpsTouched.length
                ? pad.dpsTouched.map((d) => (
                    <Link key={d} href={dpDetailHref(d)} className="rounded border border-slate-700 px-1.5 py-0.5 text-xs text-slate-200 hover:border-cyan-500">
                      {d}
                    </Link>
                  ))
                : <span className="text-slate-100">{pad.docLabel}</span>}
            </dd>
          </dl>

          <h3 className="mt-6 text-base font-semibold text-white">Rationale</h3>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-300">{pad.rationale || 'No rationale given.'}</p>

          <h3 className="mt-6 text-base font-semibold text-white">History</h3>
          <ol className="mt-2 space-y-2 border-l border-slate-800 pl-4 text-sm">
            {pad.history.map((h, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-slate-600" aria-hidden="true" />
                <span className="text-slate-500">{shortDate(h.at)}</span>{' '}
                {h.href ? (
                  <Link href={h.href} className="text-cyan-300 hover:text-cyan-200">{h.text}</Link>
                ) : (
                  <span className="text-slate-200">{h.text}</span>
                )}
              </li>
            ))}
          </ol>

          {pad.reviewNote ? (
            <>
              <h3 className="mt-6 text-base font-semibold text-white">Decision notes</h3>
              <p className="mt-2 whitespace-pre-wrap break-words rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-sm text-slate-300">
                {pad.reviewNote}
              </p>
            </>
          ) : null}

          {pad.steering ? (
            <>
              <h3 className="mt-6 text-base font-semibold text-white">Steering committee analysis</h3>
              <div className="mt-2 rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-sm sm:p-4">
                <p className="text-xs text-slate-400">
                  {pad.steering.stageTitle}
                  {pad.steering.recommendation ? ` · recommended: ${RECOMMENDATION[pad.steering.recommendation] || pad.steering.recommendation}` : ''}
                  {pad.steering.confidence ? ` (${pad.steering.confidence} confidence)` : ''}
                  {pad.steering.votes.length
                    ? ` · votes: ${pad.steering.votes.map((v) => `${v.name} (${RECOMMENDATION[v.decision] || v.decision})`).join(', ')}`
                    : ''}
                </p>
                {pad.steering.summary ? <p className="mt-2 text-slate-200">{pad.steering.summary}</p> : null}
                {pad.steering.reasons.length ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">
                    {pad.steering.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                ) : null}
                <p className="mt-2 text-xs text-slate-500">
                  From the closed steering stages of Version 1.0 (public record). The analysis was AI-assisted and checked by the steering committee.
                </p>
              </div>
            </>
          ) : null}

          {pad.related.length ? (
            <>
              <h3 className="mt-6 text-base font-semibold text-white">Related proposals</h3>
              <ul className="mt-2 space-y-2 text-sm">
                {pad.related.map((r) => (
                  <li key={r.id} className="rounded-lg border border-slate-800 bg-slate-900/30 px-3 py-2">
                    <span className="text-xs text-slate-400">
                      {r.relation} · {STATUS_LABEL[r.status]} ·{' '}
                    </span>
                    <Link href={padHref(r.id)} className="font-mono text-xs text-cyan-300 hover:text-cyan-200">{r.shortId}</Link>
                    <span className="mt-0.5 block text-slate-300">{r.snippet}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </Section>

        <Section id="weigh-in" title={open ? 'Decide and weigh in' : 'Weigh in'}>
          <div className="space-y-4">
            <PadCoEditorActions workgroupId={workgroupId} workgroupSlug={workgroupSlug} proposalId={pad.id} dpId={pad.dpId} open={open} />
            <PadAdvisory padId={pad.id} ml={pad.mlNumber} ruleBadge={rule.badge} ruleLine={rule.line} />
          </div>
        </Section>

        <Section id="invite" title="Invite others">
          <PadInvite content={proposalInviteFromLoaded(loaded)} base={publicBase()} />
        </Section>

        <Section id="chat" title="Ask about it">
          <PadChat
            padId={pad.shortId}
            dpNumber={dpNumber}
            context={padChatContext(pad, title, summary?.summary || null)}
            starters={[
              'Explain this proposal to me like I am new to the book.',
              'What would change for people if this went in?',
              'What are the strongest arguments against it?',
            ]}
          />
        </Section>
      </div>
    </main>
  );
}
