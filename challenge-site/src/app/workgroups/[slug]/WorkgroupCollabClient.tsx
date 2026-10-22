'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import WorkgroupAstraPanel from '@/components/workgroup/WorkgroupAstraPanel';
import WorkgroupCanopiEmbed from '@/components/workgroup/WorkgroupCanopiEmbed';
import WorkgroupChatPanel from '@/components/workgroup/WorkgroupChatPanel';
import WorkgroupChatTeaser from '@/components/workgroup/WorkgroupChatTeaser';
import WorkgroupExternalChatPanel from '@/components/workgroup/WorkgroupExternalChatPanel';
import WorkgroupInviteAiPanel from '@/components/workgroup/WorkgroupInviteAiPanel';
import WorkgroupInviteWelcomeModal from '@/components/workgroup/WorkgroupInviteWelcomeModal';
import WorkgroupJoinPanel from '@/components/workgroup/WorkgroupJoinPanel';
import WorkgroupLeavePanel from '@/components/workgroup/WorkgroupLeavePanel';
import WorkgroupMembersPanel from '@/components/workgroup/WorkgroupMembersPanel';
import WorkgroupNominatePanel from '@/components/workgroup/WorkgroupNominatePanel';
import WorkgroupCoEditorsPanel from '@/components/workgroup/WorkgroupCoEditorsPanel';
import WorkgroupNextSteps, { type NextStepsReadiness } from '@/components/workgroup/WorkgroupNextSteps';
import WorkgroupReviewPanel from '@/components/workgroup/WorkgroupReviewPanel';
import type { ActivityFeedItem } from '@/lib/activity-feed';
import { useAuth } from '@/lib/auth-context';
import { dpWorkgroupCardImageSrc, dpDiscoveryImageAlt, dpImageAlt } from '@/lib/dp-images';
import { govhubDraftReadHref, isDpDiscoveryWorkgroup } from '@/lib/govhub';
import { WORKGROUPS_JOIN_HREF } from '@/lib/routes';
import { fetchWorkgroupMessages } from '@/lib/workgroup-collab-api';
import { normalizeWorkgroupMessageParam } from '@/lib/workgroup-message-permalink';
import {
  normalizeWorkgroupCollabTab,
  visibleWorkgroupCollabTabs,
  WORKGROUP_CANOPI_TAB_KEYS,
  type WorkgroupCollabTabKey,
} from '@/lib/workgroup-collab-tabs';
import type { WorkgroupCollabSummary, WorkgroupMessage } from '@/lib/workgroup-collab-types';
import type { CoEditorSeatsResponse, WorkgroupRosterMember } from '@/lib/workgroup-collab-api';

type Props = {
  workgroup: WorkgroupCollabSummary;
  initialMessages: WorkgroupMessage[];
  joinHref: string;
  dpId: string | null;
  dpDetailHref: string | null;
  initialActivity?: ActivityFeedItem[];
  initialIsMember?: boolean;
  initialMembershipResolved?: boolean;
  initialCanPost?: boolean;
  /** DP site admin may invite to any workgroup without joining first. */
  initialIsDpAdmin?: boolean;
  initialCanEdit?: boolean;
  /** Set when redirected here immediately after a successful join. */
  justJoined?: boolean;
  initialMembers?: WorkgroupRosterMember[];
  /** This DP's readiness items that do not pass yet (server-side). */
  readiness?: NextStepsReadiness | null;
};

export default function WorkgroupCollabClient({
  workgroup,
  initialMessages,
  joinHref,
  dpId,
  dpDetailHref,
  initialActivity = [],
  initialIsMember = false,
  initialMembershipResolved = false,
  initialCanPost = false,
  initialIsDpAdmin = false,
  initialCanEdit = false,
  justJoined = false,
  initialMembers = [],
  readiness = null,
}: Props) {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite')?.trim() || null;
  const deepLinkChangeId = searchParams.get('change')?.trim() || null;
  const deepLinkProposalId = searchParams.get('proposal')?.trim() || null;
  const deepLinkMessageId = normalizeWorkgroupMessageParam(searchParams.get('m'));
  const { user, checked } = useAuth();
  const signedIn = Boolean(user);
  const [tab, setTab] = useState<WorkgroupCollabTabKey>(() =>
    deepLinkMessageId
      ? 'chat'
      : normalizeWorkgroupCollabTab(
          searchParams.get('tab'),
          typeof window !== 'undefined' ? window.location.hash : null,
        ),
  );
  const [isMember, setIsMember] = useState(initialIsMember || justJoined);
  const [canInvite, setCanInvite] = useState(
    Boolean(
      initialIsDpAdmin || initialIsMember || justJoined || workgroup.can_invite_members,
    ),
  );
  const [teaserMessages, setTeaserMessages] = useState(initialMessages);
  const [membershipChecked, setMembershipChecked] = useState(
    justJoined || initialMembershipResolved,
  );

  useEffect(() => {
    const rawTab = searchParams.get('tab');
    const hash = window.location.hash;
    // A message permalink (?m=) always opens the chat tab.
    const messageLink = Boolean(normalizeWorkgroupMessageParam(searchParams.get('m')));
    const next = messageLink ? 'chat' : normalizeWorkgroupCollabTab(rawTab, hash);
    setTab(next);
    if (messageLink && rawTab !== 'chat') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'chat');
      window.history.replaceState(null, '', url.toString());
    } else if (rawTab === 'edit') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', next);
      if (next !== 'astra') {
        url.hash = '';
      }
      window.history.replaceState(null, '', url.toString());
    }
  }, [searchParams]);

  useEffect(() => {
    if (deepLinkChangeId || deepLinkProposalId) {
      setTab('astra');
      const url = new URL(window.location.href);
      if (url.searchParams.get('tab') !== 'astra') {
        url.searchParams.set('tab', 'astra');
        window.history.replaceState(null, '', url.toString());
      }
    }
  }, [deepLinkChangeId, deepLinkProposalId]);

  // Co-editors land on Review unless the link named a tab.
  const tabChosen = useRef(
    Boolean(searchParams.get('tab') || deepLinkMessageId || deepLinkChangeId || deepLinkProposalId),
  );
  const [seats, setSeats] = useState<CoEditorSeatsResponse | null>(null);
  const onSeatsLoaded = useCallback((next: CoEditorSeatsResponse | null) => {
    setSeats(next);
    if (next?.viewer_is_co_editor && !tabChosen.current) {
      tabChosen.current = true;
      setTab('review');
    }
  }, []);

  const selectTab = useCallback((next: WorkgroupCollabTabKey) => {
    tabChosen.current = true;
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', next);
    window.history.replaceState(null, '', url.toString());
  }, []);

  const clearAstraDeepLinks = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('change');
    url.searchParams.delete('proposal');
    window.history.replaceState(null, '', url.toString());
  }, []);

  async function refreshMembership() {
    try {
      const data = await fetchWorkgroupMessages(workgroup.id, { full: true });
      const member = Boolean(data.is_member);
      setIsMember((prev) => member || prev);
      setCanInvite(
        (prev) =>
          member || prev || initialIsDpAdmin || Boolean(workgroup.can_invite_members),
      );
      setTeaserMessages(data.messages || initialMessages);
    } catch {
      // Keep existing membership on transient API errors.
    } finally {
      setMembershipChecked(true);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const maxAttempts = justJoined ? 4 : 1;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        if (cancelled) return;
        if (attempt > 0) {
          await new Promise((resolve) => window.setTimeout(resolve, 400 * attempt));
          if (cancelled) return;
        }
        try {
          const data = await fetchWorkgroupMessages(workgroup.id, { full: true });
          if (cancelled) return;
          const member = Boolean(data.is_member);
          setIsMember((prev) => member || prev || initialIsMember);
          setCanInvite(
            (prev) =>
              member
              || prev
              || initialIsMember
              || initialIsDpAdmin
              || Boolean(workgroup.can_invite_members),
          );
          if (!member) {
            setTeaserMessages(data.messages || initialMessages);
          }
          if (member || !justJoined || attempt === maxAttempts - 1) {
            setMembershipChecked(true);
            return;
          }
        } catch {
          if (!cancelled && (!justJoined || attempt === maxAttempts - 1)) {
            setMembershipChecked(true);
          }
          return;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    workgroup.id,
    workgroup.can_invite_members,
    initialMessages,
    signedIn,
    justJoined,
    initialIsMember,
    initialIsDpAdmin,
  ]);

  const showFullChat = membershipChecked && isMember;
  const showInviteTools = showFullChat || initialIsDpAdmin;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Gov Hub buttons hidden for now
  const docHref = govhubDraftReadHref(workgroup.document_href);
  const artSrc = dpWorkgroupCardImageSrc({ dpId, workgroupSlug: workgroup.slug });
  const artAlt = isDpDiscoveryWorkgroup(workgroup.slug)
    ? dpDiscoveryImageAlt(workgroup.name)
    : dpImageAlt(dpId || '', workgroup.name);

  const collabTabs = useMemo(
    () => visibleWorkgroupCollabTabs({ dpId, workgroup }),
    [dpId, workgroup],
  );

  const canopiEmbedActive = WORKGROUP_CANOPI_TAB_KEYS.has(tab);

  useEffect(() => {
    if (collabTabs.some((item) => item.key === tab)) return;
    setTab('next-steps');
  }, [collabTabs, tab]);

  return (
    <div className="space-y-8">
      {inviteToken ? (
        <WorkgroupInviteWelcomeModal
          inviteToken={inviteToken}
          workgroupSlug={workgroup.slug}
          workgroupName={workgroup.name}
          workgroupDescription={workgroup.description}
          onAccepted={() => void refreshMembership()}
        />
      ) : null}
      <WorkgroupCanopiEmbed active={canopiEmbedActive} />
      <header className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <div className={`flex flex-col gap-6 ${artSrc ? 'md:flex-row md:items-start' : ''}`}>
          {artSrc ? (
            <div className="relative mx-auto aspect-square w-40 shrink-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-950 sm:w-48 md:mx-0">
              <Image
                src={artSrc}
                alt={artAlt}
                fill
                className="object-cover"
                sizes="192px"
                priority
              />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">Workgroup</p>
            <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">{workgroup.name}</h1>
            {workgroup.description ? (
              <p className="mt-4 max-w-3xl text-slate-300">{workgroup.description}</p>
            ) : null}
            <div className="mt-5 flex flex-wrap items-start gap-3 text-sm">
              {membershipChecked && !isMember ? (
                <WorkgroupJoinPanel
                  workgroupId={workgroup.id}
                  workgroupName={workgroup.name}
                  workgroupSlug={workgroup.slug}
                  fallbackHref={joinHref}
                  onJoined={() => void refreshMembership()}
                />
              ) : membershipChecked && isMember ? (
                <span className="rounded-lg border border-emerald-800/60 bg-emerald-950/30 px-3 py-2 text-emerald-200">
                  You are a member
                </span>
              ) : null}
              {dpId ? <WorkgroupNominatePanel workgroupSlug={workgroup.slug} /> : null}
{/* Gov Hub buttons hidden for now (owner, 2026-10-19: people find them confusing).
              {docHref ? (
                <a
                  href={docHref}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-slate-200 hover:border-slate-500"
                >
                  {workgroup.document_label || 'Open draft'}
                </a>
              ) : null}
*/}
              <Link
                href={WORKGROUPS_JOIN_HREF}
                className="rounded-lg px-3 py-2 text-slate-400 hover:text-cyan-300"
              >
                ← All workgroups
              </Link>
              {membershipChecked && isMember ? (
                <WorkgroupLeavePanel
                  workgroupId={workgroup.id}
                  workgroupName={workgroup.name}
                  onLeft={() => void refreshMembership()}
                  className="ml-auto"
                />
              ) : null}
            </div>
            {!membershipChecked ? (
              <p className="mt-4 text-xs text-slate-500">Checking membership…</p>
            ) : null}
          </div>
        </div>
      </header>

      <WorkgroupCoEditorsPanel
        workgroupId={workgroup.id}
        dpLabel={dpId}
        isMember={membershipChecked && isMember}
        onLoaded={onSeatsLoaded}
        className="mb-6"
      />

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
        <nav
          className="flex flex-wrap items-end gap-0 border-b border-slate-800 bg-slate-950/30 px-2 pt-2"
          role="tablist"
          aria-label="Workgroup sections"
        >
          {collabTabs.map((item) => {
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={active}
                className={`relative rounded-t-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'z-10 -mb-px border-slate-800 border-b-slate-900/40 bg-slate-900/40 text-white'
                    : 'border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
                onClick={() => selectTab(item.key)}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div role="tabpanel" className="p-5 sm:p-6">
          {tab === 'next-steps' ? (
            <WorkgroupNextSteps
              workgroupId={workgroup.id}
              workgroupSlug={workgroup.slug}
              dpId={dpId}
              dpDetailHref={dpDetailHref}
              signedIn={signedIn}
              isMember={membershipChecked && isMember}
              seats={seats}
              readiness={readiness}
              initialActivity={initialActivity}
              onSelectTab={selectTab}
            />
          ) : null}

          {tab === 'review' ? (
            <WorkgroupReviewPanel
              workgroupId={workgroup.id}
              workgroupSlug={workgroup.slug}
              dpId={dpId}
              canEdit={Boolean(workgroup.can_edit || initialCanEdit)}
              isMember={isMember}
              signedIn={signedIn}
            />
          ) : null}

          {tab === 'astra' ? (
            <WorkgroupAstraPanel
              workgroupId={workgroup.id}
              workgroupSlug={workgroup.slug}
              dpId={dpId}
              canEdit={Boolean(workgroup.can_edit || initialCanEdit)}
              deepLinkChangeId={deepLinkChangeId}
              deepLinkProposalId={deepLinkProposalId}
              onDeepLinkHandled={clearAstraDeepLinks}
            />
          ) : null}

          {tab === 'chat' ? (
            <div className="space-y-10">
              {showFullChat ? (
                <WorkgroupChatPanel
                  workgroupId={workgroup.id}
                  workgroupSlug={workgroup.slug}
                  workgroupName={workgroup.name}
                  dpId={dpId}
                  signedIn={signedIn}
                  sharerUserId={user?.id ?? null}
                  initialMessages={teaserMessages}
                  initialIsMember
                  initialCanPost={initialCanPost || isMember}
                  focusMessageId={deepLinkMessageId}
                />
              ) : (
                <WorkgroupChatTeaser
                  messages={teaserMessages}
                  joinHref={joinHref}
                  workgroupName={workgroup.name}
                  isMember={isMember}
                  workgroupId={workgroup.id}
                  focusMessageId={deepLinkMessageId}
                />
              )}
              <div className="border-t border-slate-800 pt-8">
                <WorkgroupExternalChatPanel
                  workgroupSlug={workgroup.slug}
                  workgroupName={workgroup.name}
                  signedIn={signedIn}
                />
              </div>
            </div>
          ) : null}

          {tab === 'members' ? (
            <div className="space-y-10">
              <WorkgroupMembersPanel
                workgroupName={workgroup.name}
                members={initialMembers}
                coordinatorId={workgroup.coordinator_id}
                coordinatorName={workgroup.coordinator_name}
              />
              <section className="border-t border-slate-800 pt-8">
                <h2 className="text-lg font-semibold text-white">Invite someone by email</h2>
                {showInviteTools ? (
                  <div className="mt-4">
                    <WorkgroupInviteAiPanel
                      workgroupId={workgroup.id}
                      workgroupSlug={workgroup.slug}
                      canInvite={canInvite || isMember || initialIsDpAdmin}
                    />
                  </div>
                ) : (
                  <div className="mt-2">
                    <p className="text-sm text-slate-400">
                      Join this workgroup to invite people with the AI-assisted email flow. To put someone
                      forward as co-editor, use Nominate a co-editor at the top of the page.
                    </p>
                    <WorkgroupJoinPanel
                      workgroupId={workgroup.id}
                      workgroupName={workgroup.name}
                      workgroupSlug={workgroup.slug}
                      fallbackHref={joinHref}
                      isMember={isMember}
                      className="mt-4"
                      onJoined={() => void refreshMembership()}
                    />
                  </div>
                )}
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
