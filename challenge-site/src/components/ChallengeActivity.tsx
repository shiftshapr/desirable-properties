import { formatActivityDate } from '@/lib/govhub';

type ActivityListItem = {
  id: string;
  createdAt: string;
  text: string;
  href: string;
  kind?: string;
  badge?: string | null;
};

type Props = {
  items: ActivityListItem[];
};

function badgeClass(badge: string): string {
  const b = badge.toLowerCase();
  if (b === 'patch') return 'border-amber-800/60 bg-amber-950/40 text-amber-200';
  if (b === 'insert') return 'border-violet-800/60 bg-violet-950/40 text-violet-200';
  return 'border-slate-700 bg-slate-900 text-slate-300';
}

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
              {item.badge ? (
                <span
                  className={`mr-2 inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeClass(item.badge)}`}
                >
                  {item.badge}
                </span>
              ) : null}
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
