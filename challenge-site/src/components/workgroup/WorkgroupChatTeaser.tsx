import Link from 'next/link';
import WorkgroupMessageBody from '@/components/workgroup/WorkgroupMessageBody';
import type { WorkgroupMessage } from '@/lib/workgroup-collab-types';

type Props = {
  messages: WorkgroupMessage[];
  joinHref: string;
  workgroupName: string;
  /** When true, omit the join CTA (member view). */
  isMember?: boolean;
};

function formatWhen(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function WorkgroupChatTeaser({
  messages,
  joinHref,
  workgroupName,
  isMember = false,
}: Props) {
  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-sm text-slate-400">
          {isMember
            ? `Recent conversation in ${workgroupName}.`
            : `A peek at recent conversation in ${workgroupName}. Join to read the full history and post.`}
        </p>
        {isMember ? null : (
          <Link
            href={joinHref}
            className="inline-flex shrink-0 items-center rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
          >
            Join workgroup →
          </Link>
        )}
      </div>

      {messages.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No messages yet. Be the first after you join.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {messages.map((msg) => (
            <li key={msg.id} className="rounded-lg border border-slate-800/80 bg-slate-950/40 px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-cyan-200">{msg.author_name || 'Member'}</span>
                <time className="text-xs text-slate-500">{formatWhen(msg.created_at)}</time>
              </div>
              <WorkgroupMessageBody body={msg.body} className="text-slate-300" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
