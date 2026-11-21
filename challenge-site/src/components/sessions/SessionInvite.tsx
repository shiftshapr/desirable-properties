import PadInvite from '@/components/pads/PadInvite';
import { publicBase } from '@/lib/pads/pad-email.server';
import { sessionInviteFor } from '@/lib/pads/pad-invite.server';

/**
 * "Invite others" on a session page: the shared pad panel (PadInvite), with the meeting's title, date and current
 * call to action (join, vote, or read the record). Renders nothing for a path that is not a known session.
 */
export default async function SessionInvite({ path, className = '' }: { path: string; className?: string }) {
  const content = await sessionInviteFor(path);
  if (!content) return null;
  return (
    <section id="invite" aria-labelledby="invite-heading" className={`scroll-mt-24 ${className}`}>
      <h2 id="invite-heading" className="border-b border-slate-700 pb-2 text-2xl font-bold text-white">
        Invite others
      </h2>
      <div className="mt-4">
        <PadInvite content={content} base={publicBase()} />
      </div>
    </section>
  );
}
