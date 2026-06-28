import { ChallengeActivityItem, formatActivityDate } from '@/lib/govhub';

type Props = {
  items: ChallengeActivityItem[];
};

export default function ChallengeActivity({ items }: Props) {
  if (items.length === 0) {
    return (
      <p className="text-slate-400">
        Governance activity will appear here as drafts evolve, proposals are submitted, and
        workgroups advance the challenge on Gov Hub.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900/60">
      {items.map((item) => (
        <li key={item.id} className="px-5 py-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <p className="text-slate-200">
              <a href={item.href} className="hover:text-cyan-300">
                {item.text}
              </a>
            </p>
            <time className="shrink-0 text-sm text-slate-500">
              {formatActivityDate(item.createdAt)}
            </time>
          </div>
        </li>
      ))}
    </ul>
  );
}
