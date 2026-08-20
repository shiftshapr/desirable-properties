'use client';

import Link from 'next/link';

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
          Community Chats let you invite people outside the workgroup roster into a shared Hermes
          thread. Everyone invited can prompt Hermes. This is separate from Workgroup Chat, which
          stays inside the collab member thread.
        </p>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
        <p className="text-sm text-slate-300">
          Start a Community Chat for <span className="font-medium text-white">{workgroupName}</span>.
          You can invite by email or share a public link. The chat appears in your Hermes sidebar
          with a Community badge.
        </p>
        {signedIn ? (
          <Link
            href={agentHref}
            className="mt-4 inline-flex rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
          >
            Start Community Chat
          </Link>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            Sign in to start a Community Chat from Hermes.
          </p>
        )}
        <p className="mt-3 text-xs text-slate-500">
          Opens Hermes with the invite flow. Community Chats also appear under My conversations at{' '}
          <Link href="/agent" className="text-cyan-400 hover:text-cyan-200">
            /agent
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
