'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { DpDialog, DpDialogHost } from '@/components/DpDialog';
import { useAuth } from '@/lib/auth-context';
import { defaultPitch } from '@/lib/hermes-onboard/dp-directions';
import { generateDpDirections } from '@/lib/hermes-onboard/dp-directions';
import {
  ONBOARD_TABS,
  parseOnboardTab,
  padAbsoluteHref,
  padHref,
  type OnboardTabId,
} from '@/lib/hermes-onboard/tabs';
import type {
  AllianceOrg,
  BriefingMove,
  DpDirection,
  ExternalPartner,
  NextStep,
  OnboardEvent,
  OnboardSession,
  PrimitiveCopy,
  ValueMapping,
} from '@/lib/hermes-onboard/types';

type PartnerOrg = { slug: string; name: string; mission: string };

type Payload = {
  org: AllianceOrg & { partnerOrgs: PartnerOrg[] };
  session: OnboardSession;
  events: OnboardEvent[];
  signedIn: boolean;
};

const LENS_LABEL: Record<string, string> = {
  capabilities: 'Capabilities',
  reach: 'Reach',
  productivity: 'Productivity',
  impact: 'Impact',
};

export default function AllianceBriefingClient({
  initial,
  initialTab = 'brief',
}: {
  initial: Payload;
  initialTab?: OnboardTabId;
}) {
  const { user, login, loginBusy } = useAuth();
  const [data, setData] = useState(initial);
  const [tab, setTab] = useState<OnboardTabId>(initialTab);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setTab(
      parseOnboardTab(
        new URLSearchParams(window.location.search).get('tab'),
        window.location.hash,
        initialTab,
      ),
    );
  }, [initialTab]);

  const selectTab = (id: OnboardTabId) => {
    setTab(id);
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('tab', id);
    url.hash = '';
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);
  };

  const org = data.org;
  const session = data.session;
  const briefing = session.briefing;
  const pitch = defaultPitch(org);
  const dpDirections = briefing?.dpDirections?.length
    ? briefing.dpDirections
    : generateDpDirections(org);
  const signedIn = Boolean(user);

  const post = useCallback(
    async (body: Record<string, unknown>) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/pad/${encodeURIComponent(org.slug)}`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json.error || 'Could not save');
        }
        setData(json);
        return json as Payload;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not save';
        setError(message);
        await DpDialog.alert({
          title: 'Could not save',
          message,
          variant: 'danger',
        });
        return null;
      } finally {
        setBusy(false);
      }
    },
    [org.slug],
  );

  const ensureSignedIn = async () => {
    if (user) return true;
    await login();
    return true;
  };

  const ensureMemory = async () => {
    if (session.consent.sessionMemory) return true;
    const ok = await DpDialog.confirm({
      title: 'Save this landing pad?',
      message:
        'Hermes can only remember confirms, regenerations, and next steps if you allow session memory for this organization. You can turn it off later on the Rights tab.',
      variant: 'warning',
      confirmLabel: 'Allow session memory',
      cancelLabel: 'Not now',
    });
    if (!ok) return false;
    const next = await post({
      action: 'consent',
      consent: { ...session.consent, sessionMemory: true },
    });
    return Boolean(next);
  };

  const run = async (body: Record<string, unknown>) => {
    try {
      await ensureSignedIn();
    } catch {
      return;
    }
    if (body.action !== 'consent' && body.action !== 'claim') {
      const allowed = await ensureMemory();
      if (!allowed) return;
    }
    await post(body);
  };

  const agentChatHref = session.communityThreadId
    ? `/agent?thread=${encodeURIComponent(session.communityThreadId)}&from=pad&slug=${encodeURIComponent(org.slug)}`
    : `/agent?create=community&from=pad&slug=${encodeURIComponent(org.slug)}`;

  const padLink = padHref(org.slug, tab);
  const padAbsoluteLink = padAbsoluteHref(org.slug, tab);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
      <DpDialogHost />
      <p className="text-sm text-cyan-300">
        <Link href="/pad" className="hover:text-cyan-200">
          DP Studio landing pads
        </Link>
        <span className="text-slate-500"> / Project Liberty Alliance</span>
      </p>
      <div className="mt-4 rounded-lg border border-cyan-900/50 bg-cyan-950/20 px-4 py-3 text-sm text-slate-300">
        <span className="font-medium text-cyan-200">Desirable Properties Studio · Public beta.</span>{' '}
        Version 0.77 is open for review. Version 1.0 of <em>The Layered Web</em> and the public
        launch of DP Studio are September 16, 2026.
      </div>
      <header className="mt-4 border-b border-slate-800 pb-8">
        <p className="text-sm font-medium uppercase tracking-[0.15em] text-cyan-400">
          Invitation to weigh in
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">{org.name}</h1>
        <p className="mt-4 max-w-3xl text-lg font-medium leading-relaxed text-white">{pitch.headline}</p>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-300">{pitch.lead}</p>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-300">{pitch.ask}</p>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">{pitch.captureLine}</p>
        <p className="mt-3 text-sm text-slate-500">
          Public packet only. Hypothesis marks stay until you confirm sources. Each Alliance member
          gets a different pitch so we can experiment. Your pad is{' '}
          <Link href={padLink} className="font-mono text-cyan-400 hover:text-cyan-200">
            {padAbsoluteHref(org.slug)}
          </Link>{' '}
          (hyphens optional). Direct link to this tab:{' '}
          <Link href={padLink} className="font-mono text-cyan-400 hover:text-cyan-200">
            {padAbsoluteLink}
          </Link>
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <a
            href={org.website}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
            target="_blank"
            rel="noreferrer"
          >
            Website
          </a>
          <a
            href={org.allianceUrl}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
            target="_blank"
            rel="noreferrer"
          >
            Alliance page
          </a>
          {session.claimedBy ? (
            <span className="rounded-lg bg-emerald-900/40 px-3 py-1.5 text-sm text-emerald-200">
              Claimed{session.claimedBy.domainMatched ? ' (domain match)' : ''}
            </span>
          ) : (
            <button
              type="button"
              disabled={busy || loginBusy}
              onClick={() => void run({ action: 'claim' })}
              className="rounded-lg bg-cyan-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
            >
              {signedIn ? 'Claim this landing pad' : 'Sign in to claim'}
            </button>
          )}
        </div>
      </header>

      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

      <div className="mt-6 flex flex-wrap gap-2">
        {ONBOARD_TABS.map((item) => (
          <Link
            key={item.id}
            href={padHref(org.slug, item.id)}
            onClick={(e) => {
              e.preventDefault();
              selectTab(item.id);
            }}
            className={`rounded-full px-3 py-1.5 text-sm ${
              tab === item.id
                ? 'bg-cyan-800 text-white'
                : 'border border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="mt-8">
        {tab === 'brief' && briefing ? (
          <BriefTab
            moves={briefing.moves}
            busy={busy}
            onRegenerate={() => void run({ action: 'generate' })}
            onPin={(moveId) => void run({ action: 'pin-move', moveId })}
            onDismiss={(moveId) => void run({ action: 'dismiss-move', moveId })}
          />
        ) : null}
        {tab === 'dp' ? (
          <DpTab
            org={org}
            pitch={pitch}
            directions={dpDirections}
            onOpenCommunity={() => selectTab('community')}
          />
        ) : null}
        {tab === 'values' && briefing ? (
          <ValuesTab
            org={org}
            mappings={briefing.valuesMappings}
            missionConfirmed={Boolean(session.confirmed.mission)}
            busy={busy}
            onConfirmMission={() => void run({ action: 'confirm', mission: true })}
            onConfirmValue={(value) => {
              const values = Array.from(new Set([...(session.confirmed.values || []), value]));
              void run({ action: 'confirm', values });
            }}
          />
        ) : null}
        {tab === 'own' && briefing ? <CopyBlock title={briefing.ownLayer.title} body={briefing.ownLayer.body} /> : null}
        {tab === 'partners' && briefing ? (
          <PartnersTab
            org={org}
            partnerLayer={briefing.partnerLayer}
            confirmed={Boolean(session.confirmed.partners)}
            busy={busy}
            onConfirm={() => void run({ action: 'confirm', partners: true })}
          />
        ) : null}
        {tab === 'primitives' && briefing ? (
          <PrimitivesTab
            primitives={briefing.primitives}
            busy={busy}
            onSave={(ids) => void run({ action: 'primitives', primitives: ids })}
          />
        ) : null}
        {tab === 'rights' ? (
          <RightsTab
            session={session}
            events={data.events}
            busy={busy}
            onConsent={(consent) => void run({ action: 'consent', consent })}
            onConfirmSources={() => void run({ action: 'confirm', sources: true })}
          />
        ) : null}
        {tab === 'next' && briefing ? (
          <NextTab
            steps={session.nextSteps.length ? session.nextSteps : briefing.nextSteps}
            busy={busy}
            onAccept={(stepId) => void run({ action: 'accept-step', stepId })}
          />
        ) : null}
        {tab === 'community' ? (
          <CommunityTab
            org={org}
            session={session}
            busy={busy}
            agentHref={agentChatHref}
            onCreate={() => void run({ action: 'community-chat' })}
          />
        ) : null}
      </div>
    </div>
  );
}

function DpTab({
  org,
  pitch,
  directions,
  onOpenCommunity,
}: {
  org: AllianceOrg;
  pitch: NonNullable<AllianceOrg['pitch']>;
  directions: DpDirection[];
  onOpenCommunity: () => void;
}) {
  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-white">Weigh in on the Desirable Properties</h2>
        <p className="mt-3 text-slate-300 leading-relaxed">{pitch.ask}</p>
        <p className="mt-3 text-sm text-slate-400">
          These directions are generated from {org.name}&apos;s public corpus, not from private
          landing pads. Each one is a hypothesis. Follow the interest that feels like your work. The
          Hermes prompt and Discuss link are real contribution paths, not a brochure.
        </p>
      </div>
      <div className="space-y-4">
        {directions.map((row) => (
          <article key={row.dpId} className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <p className="text-xs uppercase tracking-wide text-cyan-400">
              {row.dpId}
              {row.hypothesis ? ' · hypothesis' : ''}
            </p>
            <h3 className="mt-1 text-lg font-semibold text-white">{row.dpName}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{row.whyFromCorpus}</p>
            <p className="mt-3 text-sm font-medium text-white">Direction to explore</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">{row.direction}</p>
            <p className="mt-3 text-sm font-medium text-white">Candidate patch idea</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">{row.patchIdea}</p>
            <ul className="mt-3 space-y-1 text-xs">
              {row.citations.map((cite) => (
                <li key={cite.url}>
                  <a href={cite.url} className="text-cyan-400 hover:text-cyan-200" target="_blank" rel="noreferrer">
                    Corpus: {cite.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={row.hermesHref}
                className="rounded-md bg-cyan-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-600"
              >
                Draft with Hermes
              </Link>
              <a
                href={row.discussHref}
                className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
                target="_blank"
                rel="noreferrer"
              >
                Open chapter in Discuss
              </a>
              <Link
                href={row.chapterHref}
                className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
              >
                Challenge page
              </Link>
              <Link
                href={row.workgroupHref}
                className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
              >
                Workgroup
              </Link>
            </div>
          </article>
        ))}
      </div>
      <p className="text-sm text-slate-400">
        Want to work this as a group?{' '}
        <button type="button" onClick={onOpenCommunity} className="text-cyan-300 hover:text-cyan-200">
          Open Community Chat
        </button>
        .
      </p>
    </section>
  );
}

function CopyBlock({ title, body }: { title: string; body: string }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="mt-3 text-slate-300 leading-relaxed">{body}</p>
    </section>
  );
}

function BriefTab({
  moves,
  busy,
  onRegenerate,
  onPin,
  onDismiss,
}: {
  moves: BriefingMove[];
  busy: boolean;
  onRegenerate: () => void;
  onPin: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">Top three moves</h2>
          <p className="mt-1 text-sm text-slate-400">
            Scored for capabilities, reach, productivity, and impact. Own layer and partner layer
            both appear when the packet supports them.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={onRegenerate}
          className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
        >
          Regenerate
        </button>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {moves.map((move) => (
          <article key={move.id} className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <p className="text-xs uppercase tracking-wide text-cyan-400">
              {move.layer === 'own' ? 'Own layer' : 'Collaborative'} · {LENS_LABEL[move.lens]}
            </p>
            <h3 className="mt-2 text-base font-semibold text-white">{move.title}</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-300">{move.summary}</p>
            {move.hypothesis ? (
              <p className="mt-2 text-xs text-amber-300">Hypothesis until sources are confirmed.</p>
            ) : null}
            <p className="mt-3 text-xs text-slate-500">{move.why}</p>
            <p className="mt-2 text-xs text-slate-500">
              Primitives: {move.primitives.join(', ')}
            </p>
            <ul className="mt-2 space-y-1 text-xs">
              {move.citations.map((cite) => (
                <li key={cite.url}>
                  <a href={cite.url} className="text-cyan-400 hover:text-cyan-200" target="_blank" rel="noreferrer">
                    {cite.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => onPin(move.id)}
                className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
              >
                Pin
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onDismiss(move.id)}
                className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:bg-slate-800"
              >
                Dismiss
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ValuesTab({
  org,
  mappings,
  missionConfirmed,
  busy,
  onConfirmMission,
  onConfirmValue,
}: {
  org: AllianceOrg;
  mappings: ValueMapping[];
  missionConfirmed: boolean;
  busy: boolean;
  onConfirmMission: () => void;
  onConfirmValue: (value: string) => void;
}) {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Stated mission</h2>
        <p className="mt-2 text-slate-300 leading-relaxed">{org.mission}</p>
        <button
          type="button"
          disabled={busy || missionConfirmed}
          onClick={onConfirmMission}
          className="mt-3 rounded-lg bg-cyan-700 px-3 py-1.5 text-sm text-white hover:bg-cyan-600 disabled:opacity-50"
        >
          {missionConfirmed ? 'Mission confirmed' : 'Confirm this mission excerpt'}
        </button>
      </div>
      <div>
        <h2 className="text-xl font-semibold text-white">Values to Overweb mappings</h2>
        <p className="mt-1 text-sm text-slate-400">
          Confirm only mappings that match how you use these words. Rejected mappings stay off the
          next brief.
        </p>
        <div className="mt-4 space-y-3">
          {mappings.map((row) => (
            <div key={row.value} className="rounded-lg border border-slate-800 p-4">
              <p className="font-medium text-white">{row.value}</p>
              <p className="mt-1 text-sm text-slate-300">Overweb: {row.desirableProperty}</p>
              <p className="mt-1 text-sm text-slate-400">Candidate MPA: {row.mpa}</p>
              <button
                type="button"
                disabled={busy || row.confirmed}
                onClick={() => onConfirmValue(row.value)}
                className="mt-3 rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-50"
              >
                {row.confirmed ? 'Confirmed' : 'Confirm mapping'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PartnersTab({
  org,
  partnerLayer,
  confirmed,
  busy,
  onConfirm,
}: {
  org: AllianceOrg & { partnerOrgs: PartnerOrg[] };
  partnerLayer: { title: string; body: string };
  confirmed: boolean;
  busy: boolean;
  onConfirm: () => void;
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-white">{partnerLayer.title}</h2>
      <p className="mt-3 text-slate-300 leading-relaxed">{partnerLayer.body}</p>
      <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Directory partners
      </h3>
      <ul className="mt-2 space-y-2">
        {org.partnerOrgs.map((partner) => (
          <li key={partner.slug}>
            <Link
              href={padHref(partner.slug, 'dp')}
              className="text-cyan-300 hover:text-cyan-200"
            >
              {partner.name}
            </Link>
            <span className="text-sm text-slate-400"> – {partner.mission}</span>
          </li>
        ))}
      </ul>
      {org.externalPartners.length > 0 ? (
        <>
          <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Named public collaborators
          </h3>
          <ul className="mt-2 space-y-2 text-sm text-slate-300">
            {org.externalPartners.map((partner: ExternalPartner) => (
              <li key={partner.url}>
                <a href={partner.url} className="text-cyan-300 hover:text-cyan-200" target="_blank" rel="noreferrer">
                  {partner.name}
                </a>
                {partner.note ? <span className="text-slate-500"> – {partner.note}</span> : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <button
        type="button"
        disabled={busy || confirmed}
        onClick={onConfirm}
        className="mt-6 rounded-lg bg-cyan-700 px-3 py-1.5 text-sm text-white hover:bg-cyan-600 disabled:opacity-50"
      >
        {confirmed ? 'Partners confirmed' : 'Confirm this partner list'}
      </button>
    </section>
  );
}

function PrimitivesTab({
  primitives,
  busy,
  onSave,
}: {
  primitives: PrimitiveCopy[];
  busy: boolean;
  onSave: (ids: string[]) => void;
}) {
  const [local, setLocal] = useState(() => primitives.filter((row) => row.enabled).map((row) => row.id));
  const selected = useMemo(() => new Set(local), [local]);

  return (
    <section>
      <h2 className="text-xl font-semibold text-white">Overweb primitives in your vocabulary</h2>
      <p className="mt-2 text-sm text-slate-400">
        Toggle what is in scope. Hermes rewrites the top three using only enabled primitives.
      </p>
      <ul className="mt-4 space-y-2">
        {primitives.map((row) => (
          <li key={row.id} className="flex items-start gap-3 rounded-lg border border-slate-800 p-3">
            <input
              id={`prim-${row.id}`}
              type="checkbox"
              checked={selected.has(row.id)}
              onChange={() => {
                setLocal((prev) =>
                  prev.includes(row.id) ? prev.filter((id) => id !== row.id) : [...prev, row.id],
                );
              }}
              className="mt-1"
            />
            <label htmlFor={`prim-${row.id}`} className="cursor-pointer">
              <span className="font-medium text-white">{row.name}</span>
              <span className="mt-0.5 block text-sm text-slate-400">{row.translation}</span>
            </label>
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={busy}
        onClick={() => onSave(local)}
        className="mt-4 rounded-lg bg-cyan-700 px-3 py-1.5 text-sm text-white hover:bg-cyan-600 disabled:opacity-50"
      >
        Apply to next brief
      </button>
    </section>
  );
}

function RightsTab({
  session,
  events,
  busy,
  onConsent,
  onConfirmSources,
}: {
  session: OnboardSession;
  events: OnboardEvent[];
  busy: boolean;
  onConsent: (consent: OnboardSession['consent']) => void;
  onConfirmSources: () => void;
}) {
  const c = session.consent;
  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-white">Consent</h2>
        <p className="mt-2 text-sm text-slate-400">
          Public read uses only URLs listed on this packet. Session memory stores confirms on this
          org record. Cross-subject learning stays off unless you opt in (coarse tags only).
        </p>
        <ul className="mt-4 space-y-3">
          {(
            [
              ['publicRead', 'Public read of listed sources', c.publicRead],
              ['sessionMemory', 'Session memory for this organization', c.sessionMemory],
              ['crossSubjectLearning', 'Share anonymized Alliance patterns', c.crossSubjectLearning],
            ] as const
          ).map(([key, label, on]) => (
            <li key={key} className="flex items-center justify-between gap-4 rounded-lg border border-slate-800 px-4 py-3">
              <span className="text-sm text-slate-200">{label}</span>
              <button
                type="button"
                disabled={busy}
                onClick={() => onConsent({ ...c, [key]: !on })}
                className={`rounded-full px-3 py-1 text-xs ${
                  on ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {on ? 'On' : 'Off'}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="text-xl font-semibold text-white">Sources Hermes may cite</h2>
        <button
          type="button"
          disabled={busy || session.confirmed.sources}
          onClick={onConfirmSources}
          className="mt-3 rounded-lg bg-cyan-700 px-3 py-1.5 text-sm text-white hover:bg-cyan-600 disabled:opacity-50"
        >
          {session.confirmed.sources ? 'Sources confirmed' : 'Confirm listed source URLs'}
        </button>
      </div>
      <div>
        <h2 className="text-xl font-semibold text-white">Event ledger</h2>
        {events.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Sign in to see writes stored for this landing pad.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-slate-400">
            {events.map((event) => (
              <li key={event.id} className="border-b border-slate-900 pb-2">
                <span className="text-slate-200">{event.kind}</span>
                <span className="text-slate-600"> · {event.createdAt}</span>
                {event.actor?.displayName ? (
                  <span className="text-slate-500"> · {event.actor.displayName}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function NextTab({
  steps,
  busy,
  onAccept,
}: {
  steps: NextStep[];
  busy: boolean;
  onAccept: (id: string) => void;
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-white">Next steps Hermes ranked</h2>
      <p className="mt-2 text-sm text-slate-400">
        Accepting a step is a commitment on this record, not a PDF. Community Chat and claim
        complete themselves when you do those actions.
      </p>
      <ol className="mt-5 space-y-3">
        {steps.map((step) => (
          <li key={step.id} className="rounded-lg border border-slate-800 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-white">{step.title}</p>
                <p className="mt-1 text-sm text-slate-400">{step.why}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{step.system}</p>
              </div>
              <span className="text-xs text-slate-400">{step.status}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {step.status === 'open' ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onAccept(step.id)}
                  className="rounded-md bg-cyan-700 px-3 py-1.5 text-xs text-white hover:bg-cyan-600 disabled:opacity-50"
                >
                  Accept
                </button>
              ) : null}
              {step.href ? (
                <Link
                  href={step.href}
                  className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
                >
                  Open
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function CommunityTab({
  org,
  session,
  busy,
  agentHref,
  onCreate,
}: {
  org: AllianceOrg;
  session: OnboardSession;
  busy: boolean;
  agentHref: string;
  onCreate: () => void;
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-white">Hermes Community Chat</h2>
      <p className="mt-3 text-slate-300 leading-relaxed">
        Invite Alliance colleagues into a shared Hermes thread for {org.name}. Everyone invited can
        prompt. The thread origin is this landing pad, so it shows as a landing pad in the
        Hermes sidebar instead of a private orphan.
      </p>
      {session.communityThreadId ? (
        <p className="mt-4 text-sm text-emerald-300">
          Chat exists{session.communityThreadTitle ? `: ${session.communityThreadTitle}` : ''}.
        </p>
      ) : (
        <p className="mt-4 text-sm text-slate-400">No Community Chat yet for this landing pad.</p>
      )}
      <div className="mt-5 flex flex-wrap gap-3">
        {session.communityThreadId ? (
          <Link
            href={agentHref}
            className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
          >
            Open in Hermes
          </Link>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={onCreate}
            className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
          >
            Create Community Chat
          </button>
        )}
        <Link
          href={agentHref}
          className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
        >
          {session.communityThreadId ? 'Invite more people' : 'Create from Hermes instead'}
        </Link>
      </div>
    </section>
  );
}
