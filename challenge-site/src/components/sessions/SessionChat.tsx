import Link from 'next/link';
import SessionChatPanel from '@/components/sessions/SessionChatPanel';
import { readSession } from '@/lib/auth-session';
import { sessionChatThreadKey } from '@/lib/sessions/session-chat-core';

type Props = {
  /** Session occurrence slug; must be listed in SESSION_CHAT_SLUGS. */
  slug: string;
  /** This page's path, to come back to after signing in. */
  pagePath: string;
  id?: string;
  /** Meeting-specific heading. */
  heading?: string;
};

/**
 * "Session chat": one chat thread for this session occurrence, on the session page itself. Server component: a
 * signed-out request gets only a sign-in prompt and never loads messages (the API refuses it too, with 401). Same
 * posture as the WhatsApp and Signal links (CommunityGroups). Open before, during and after the meeting.
 */
export default async function SessionChat({ slug, pagePath, id = 'session-chat', heading = 'Session chat' }: Props) {
  if (!sessionChatThreadKey(slug)) return null;
  const session = await readSession();
  const signInHref = `/login?next=${encodeURIComponent(`${pagePath}#${id}`)}`;

  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-24">
      <h2 id={`${id}-heading`} className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">
        {heading}
      </h2>
      <div className="mt-4">
        {session ? (
          <SessionChatPanel slug={slug} currentUserId={session.userId} signInHref={signInHref} />
        ) : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <p className="text-base text-slate-300">Sign in to join the session chat.</p>
            <Link
              href={signInHref}
              className="inline-flex items-center rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
            >
              Sign in
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
