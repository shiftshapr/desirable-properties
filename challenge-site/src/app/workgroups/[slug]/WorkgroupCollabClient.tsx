'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import WorkgroupChatPanel from '@/components/workgroup/WorkgroupChatPanel';
import WorkgroupChatTeaser from '@/components/workgroup/WorkgroupChatTeaser';
import WorkgroupGettingStarted from '@/components/workgroup/WorkgroupGettingStarted';
import WorkgroupInviteAiPanel from '@/components/workgroup/WorkgroupInviteAiPanel';
import WorkgroupJoinPanel from '@/components/workgroup/WorkgroupJoinPanel';
import WorkgroupLeavePanel from '@/components/workgroup/WorkgroupLeavePanel';
import WorkgroupNominatePanel from '@/components/workgroup/WorkgroupNominatePanel';
import { useAuth } from '@/lib/auth-context';
import { govhubUrl } from '@/lib/govhub';
import { fetchWorkgroupMessages } from '@/lib/workgroup-collab-api';
import type { WorkgroupCollabSummary, WorkgroupMessage } from '@/lib/workgroup-collab-types';

type Props = {
  workgroup: WorkgroupCollabSummary;
  initialMessages: WorkgroupMessage[];
  joinHref: string;
  dpId: string | null;
  dpDetailHref: string | null;
};

export default function WorkgroupCollabClient({
  workgroup,
  initialMessages,
  joinHref,
  dpId,
  dpDetailHref,
}: Props) {
  const { user, checked } = useAuth();
  const signedIn = Boolean(user);
  const [isMember, setIsMember] = useState(false);
  const [canInvite, setCanInvite] = useState(Boolean(workgroup.can_invite_members));
  const [teaserMessages, setTeaserMessages] = useState(initialMessages);
  const [membershipChecked, setMembershipChecked] = useState(false);

  async function refreshMembership() {
    try {
      const data = await fetchWorkgroupMessages(workgroup.id, { full: true });
      setIsMember(Boolean(data.is_member));
      setCanInvite(Boolean(data.is_member) || Boolean(workgroup.can_invite_members));
      if (!data.is_member) {
        setTeaserMessages(data.messages || initialMessages);
      }
    } catch {
      setIsMember(false);
    } finally {
      setMembershipChecked(true);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchWorkgroupMessages(workgroup.id, { full: true });
        if (cancelled) return;
        setIsMember(Boolean(data.is_member));
        setCanInvite(Boolean(data.is_member) || Boolean(workgroup.can_invite_members));
        if (!data.is_member) {
          setTeaserMessages(data.messages || initialMessages);
        }
      } catch {
        if (!cancelled) setIsMember(false);
      } finally {
        if (!cancelled) setMembershipChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workgroup.id, workgroup.can_invite_members, initialMessages, signedIn]);

  const showFullChat = membershipChecked && isMember;
  const govHubHref = govhubUrl(`/workgroups/${workgroup.slug}/`);
  const docHref = workgroup.document_href ? govhubUrl(workgroup.document_href) : null;
  const nominateFallback = `${govHubHref}?action=nominate`;

  return (
    <div className="space-y-8">
      <header className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">Workgroup</p>
        <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">{workgroup.name}</h1>
        {workgroup.description ? (
          <p className="mt-4 max-w-3xl text-slate-300">{workgroup.description}</p>
        ) : null}
        <div className="mt-5 flex flex-wrap items-start gap-3 text-sm">
          {!isMember ? (
            <WorkgroupJoinPanel
              workgroupId={workgroup.id}
              workgroupName={workgroup.name}
              fallbackHref={joinHref}
              onJoined={() => void refreshMembership()}
            />
          ) : (
            <>
              <span className="rounded-lg border border-emerald-800/60 bg-emerald-950/30 px-3 py-2 text-emerald-200">
                You are a member
              </span>
              <WorkgroupLeavePanel
                workgroupId={workgroup.id}
                workgroupName={workgroup.name}
                onLeft={() => void refreshMembership()}
              />
            </>
          )}
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
          <Link href="/workgroups/join" className="rounded-lg px-3 py-2 text-slate-400 hover:text-cyan-300">
            ← All workgroups
          </Link>
        </div>
        {!checked || !membershipChecked ? (
          <p className="mt-4 text-xs text-slate-500">Checking membership…</p>
        ) : null}
      </header>

      <WorkgroupGettingStarted
        workgroupName={workgroup.name}
        workgroupSlug={workgroup.slug}
        dpId={dpId}
        dpDetailHref={dpDetailHref}
      />

      {showFullChat ? (
        <WorkgroupChatPanel
          workgroupId={workgroup.id}
          workgroupSlug={workgroup.slug}
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
      )}

      {showFullChat ? (
        <WorkgroupInviteAiPanel
          workgroupId={workgroup.id}
          workgroupSlug={workgroup.slug}
          canInvite={canInvite || isMember}
        />
      ) : null}
    </div>
  );
}
