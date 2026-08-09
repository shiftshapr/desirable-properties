'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import WorkgroupActivityFeed from '@/components/workgroup/WorkgroupActivityFeed';
import WorkgroupChatPanel from '@/components/workgroup/WorkgroupChatPanel';
import WorkgroupChatTeaser from '@/components/workgroup/WorkgroupChatTeaser';
import WorkgroupGettingStarted from '@/components/workgroup/WorkgroupGettingStarted';
import WorkgroupInviteAiPanel from '@/components/workgroup/WorkgroupInviteAiPanel';
import WorkgroupJoinPanel from '@/components/workgroup/WorkgroupJoinPanel';
import WorkgroupLeavePanel from '@/components/workgroup/WorkgroupLeavePanel';
import WorkgroupNominatePanel from '@/components/workgroup/WorkgroupNominatePanel';
import type { ActivityFeedItem } from '@/lib/activity-feed';
import { useAuth } from '@/lib/auth-context';
import { dpWorkgroupCardImageSrc, dpDiscoveryImageAlt, dpImageAlt } from '@/lib/dp-images';
import { govhubDraftReadHref, govhubUrl, isDpDiscoveryWorkgroup } from '@/lib/govhub';
import { fetchWorkgroupMessages } from '@/lib/workgroup-collab-api';
import {
  normalizeWorkgroupCollabTab,
  WORKGROUP_COLLAB_TABS,
  type WorkgroupCollabTabKey,
} from '@/lib/workgroup-collab-tabs';
import type { WorkgroupCollabSummary, WorkgroupMessage } from '@/lib/workgroup-collab-types';

type Props = {
  workgroup: WorkgroupCollabSummary;
  initialMessages: WorkgroupMessage[];
  joinHref: string;
  dpId: string | null;
  dpDetailHref: string | null;
  initialActivity?: ActivityFeedItem[];
  initialIsMember?: boolean;
  initialMembershipResolved?: boolean;
  /** Set when redirected here immediately after a successful join. */
  justJoined?: boolean;
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
  justJoined = false,
}: Props) {
  const searchParams = useSearchParams();
  const { user, checked } = useAuth();
  const signedIn = Boolean(user);
  const [tab, setTab] = useState<WorkgroupCollabTabKey>(() =>
    normalizeWorkgroupCollabTab(searchParams.get('tab')),
  );
  const [isMember, setIsMember] = useState(initialIsMember || justJoined);
  const [canInvite, setCanInvite] = useState(
    Boolean(initialIsMember || justJoined || workgroup.can_invite_members),
  );
  const [teaserMessages, setTeaserMessages] = useState(initialMessages);
  const [membershipChecked, setMembershipChecked] = useState(
    justJoined || initialMembershipResolved,
  );

  useEffect(() => {
    setTab(normalizeWorkgroupCollabTab(searchParams.get('tab')));
  }, [searchParams]);

  const selectTab = useCallback((next: WorkgroupCollabTabKey) => {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', next);
    window.history.replaceState(null, '', url.toString());
  }, []);

  async function refreshMembership() {
    try {
      const data = await fetchWorkgroupMessages(workgroup.id, { full: true });
      setIsMember(Boolean(data.is_member));
      setCanInvite(Boolean(data.is_member) || Boolean(workgroup.can_invite_members));
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
          setIsMember(member);
          setCanInvite(member || Boolean(workgroup.can_invite_members));
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
  }, [workgroup.id, workgroup.can_invite_members, initialMessages, signedIn, justJoined]);

  const showFullChat = membershipChecked && isMember;
  const govHubHref = govhubUrl(`/workgroups/${workgroup.slug}/`);
  const docHref = govhubDraftReadHref(workgroup.document_href);
  const nominateFallback = `${govHubHref}?action=nominate`;
  const artSrc = dpWorkgroupCardImageSrc({ dpId, workgroupSlug: workgroup.slug });
  const artAlt = isDpDiscoveryWorkgroup(workgroup.slug)
    ? dpDiscoveryImageAlt(workgroup.name)
    : dpImageAlt(dpId || '', workgroup.name);

  return (
    <div className="space-y-8">
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
              <WorkgroupNominatePanel
                workgroupId={workgroup.id}
                fallbackHref={nominateFallback}
              />
              {docHref ? (
                <a
                  href={docHref}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-slate-200 hover:border-slate-500"
                >
                  {workgroup.document_label || 'Open draft'}
                </a>
              ) : null}
              <Link
                href="/workgroups/join"
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

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
        <nav
          className="flex flex-wrap items-end gap-0 border-b border-slate-800 bg-slate-950/30 px-2 pt-2"
          role="tablist"
          aria-label="Workgroup sections"
        >
          {WORKGROUP_COLLAB_TABS.map((item) => {
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
          {tab === 'getting-started' ? (
            <WorkgroupGettingStarted
              workgroupName={workgroup.name}
              workgroupSlug={workgroup.slug}
              dpId={dpId}
              dpDetailHref={dpDetailHref}
              documentHref={workgroup.document_href}
            />
          ) : null}

          {tab === 'chat' ? (
            showFullChat ? (
              <WorkgroupChatPanel
                workgroupId={workgroup.id}
                workgroupSlug={workgroup.slug}
                workgroupName={workgroup.name}
                dpId={dpId}
                signedIn={signedIn}
                initialMessages={teaserMessages}
                initialIsMember
              />
            ) : (
              <WorkgroupChatTeaser
                messages={teaserMessages}
                joinHref={joinHref}
                workgroupName={workgroup.name}
              />
            )
          ) : null}

          {tab === 'activity' ? (
            <WorkgroupActivityFeed
              workgroupSlug={workgroup.slug}
              dpId={dpId}
              initialItems={initialActivity}
            />
          ) : null}

          {tab === 'invite' ? (
            showFullChat ? (
              <WorkgroupInviteAiPanel
                workgroupId={workgroup.id}
                workgroupSlug={workgroup.slug}
                canInvite={canInvite || isMember}
              />
            ) : (
              <div>
                <p className="text-sm text-slate-400">
                  Join this workgroup to invite people with the AI-assisted email flow.
                </p>
                <Link
                  href={joinHref}
                  className="mt-4 inline-flex rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
                >
                  Join workgroup
                </Link>
              </div>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
