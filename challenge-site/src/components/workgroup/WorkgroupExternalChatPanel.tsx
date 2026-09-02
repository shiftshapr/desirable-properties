'use client';

import Link from 'next/link';
import NamedTabLink from '@/components/NamedTabLink';

type WorkgroupExternalChatPanelProps = {
  workgroupSlug: string;
  workgroupName: string;
  signedIn: boolean;
};

export default function WorkgroupExternalChatPanel({
  workgroupSlug,
  workgroupName,
  signedIn,
}: WorkgroupExternalChatPanelProps) {
  const agentHref = `/agent?create=community&from=workgroup&wg=${encodeURIComponent(workgroupSlug)}`;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">External Chat</h2>
        <p className="mt-2 text-sm text-slate-400">
          Community Chats match workgroup Collab: human messages in the main panel and private Deepi in the right sidebar.
          Invite people outside the workgroup by email or link. This is separate from Workgroup Chat, which stays inside the member thread.
        </p>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
        <p className="text-sm text-slate-300">
          Start a Community Chat for <span className="font-medium text-white">{workgroupName}</span>.
          You pick who joins. Everyone invited can post in the member chat and use private Deepi in the sidebar.
          The chat appears in your Deepi sidebar with a Community badge.
        </p>
        {signedIn ? (
          <NamedTabLink
            href={agentHref}
            className="mt-4 inline-flex rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
          >
            Start Community Chat
          </NamedTabLink>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            Sign in to start a Community Chat from Deepi.
          </p>
        )}
        <p className="mt-3 text-xs text-slate-500">
          Opens Deepi with the invite flow. Community Chats also appear under My conversations at{' '}
          <Link href="/agent" className="text-cyan-400 hover:text-cyan-200">
            /agent
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
