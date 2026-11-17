import Link from 'next/link';
import { communityGroupsForViewer } from '@/lib/community-groups.server';

type Props = {
  /** Path (with optional #anchor) to come back to after signing in. */
  returnTo: string;
  /** Anchor id for the box, so other pages and the account menu can link to it. */
  id?: string;
  heading?: string;
  className?: string;
};

/**
 * "Stay in touch between sessions": the WhatsApp and Signal groups. Server component; the invite links are rendered
 * only for a signed-in request (see community-groups.server.ts). Signed out, it asks people to sign in. With no
 * group configured on this box, it renders nothing.
 */
export default async function CommunityGroups({
  returnTo,
  id = 'community-groups',
  heading = 'Stay in touch between sessions',
  className = '',
}: Props) {
  const view = await communityGroupsForViewer();
  if (view.state === 'off') return null;

  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className={`scroll-mt-24 rounded-xl border border-cyan-800/60 bg-cyan-950/20 px-5 py-5 ${className}`}
    >
      <h2 id={`${id}-heading`} className="text-xl font-bold text-white">
        {heading}
      </h2>
      {view.state === 'signed-out' ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-3">
          <p className="text-base text-slate-300">Sign in to see the WhatsApp and Signal groups.</p>
          <Link
            href={`/login?next=${encodeURIComponent(returnTo)}`}
            className="inline-flex items-center rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
          >
            Sign in
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-2 text-base text-slate-300">
            Keep the conversation going between Monday sessions. Use whichever works where you are: Signal does not
            work in some countries, Oman among them.
          </p>
          <ul className="mt-4 flex flex-wrap gap-3">
            {view.groups.map((g) => (
              <li key={g.key}>
                <a
                  href={g.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center rounded-lg border border-cyan-600/70 bg-slate-950/60 px-4 py-2 text-sm font-semibold text-cyan-200 hover:border-cyan-400 hover:text-white"
                >
                  {g.name} ↗
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            These invite links are for signed-in members. Please do not repost them publicly.
          </p>
        </>
      )}
    </section>
  );
}
