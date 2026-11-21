import type { ReactNode } from 'react';

type Props = {
  /** Anchor id. Deep links to this id, or to any id inside, open the section (SessionAnchors). */
  id: string;
  title: ReactNode;
  /** h2 for a page section, h3 inside one. */
  level?: 2 | 3;
  /** Shown next to the title, e.g. a provenance label. */
  badge?: ReactNode;
  className?: string;
  children: ReactNode;
};

/**
 * A section that starts closed and shows only its title: a native <details>/<summary>, so it works without
 * JavaScript, with the keyboard and with screen readers. Used for the static or long parts of a session page.
 */
export default function SessionCollapsible({ id, title, level = 2, badge, className = '', children }: Props) {
  const Heading = level === 2 ? 'h2' : 'h3';
  return (
    <details
      id={id}
      className={`session-collapsible group scroll-mt-24 rounded-xl border border-slate-700/80 bg-slate-900/40 open:bg-slate-900/25 ${className}`}
    >
      <summary className="flex cursor-pointer list-none items-start gap-3 rounded-xl px-4 py-3 hover:bg-slate-800/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 sm:px-5 [&::-webkit-details-marker]:hidden">
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className="mt-1.5 h-4 w-4 shrink-0 text-cyan-300 transition-transform group-open:rotate-90"
          fill="currentColor"
        >
          <path d="M7 4l7 6-7 6V4z" />
        </svg>
        <Heading
          className={`flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 font-semibold text-white ${
            level === 2 ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'
          }`}
        >
          <span className="min-w-0">{title}</span>
          {badge}
        </Heading>
      </summary>
      <div className="border-t border-slate-800 px-4 pb-5 pt-4 sm:px-5">{children}</div>
    </details>
  );
}
