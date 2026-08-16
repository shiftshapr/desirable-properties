import type { ReactNode } from 'react';

export type FaqItem = {
  q: string;
  a: ReactNode;
  steps?: string[];
  footer?: ReactNode;
};

export default function FaqList({
  items,
  defaultOpenIndex = 0,
}: {
  items: FaqItem[];
  defaultOpenIndex?: number;
}) {
  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <details
          key={item.q}
          className="group rounded-xl border border-slate-800 bg-slate-900/40 open:border-violet-700/60 open:bg-slate-900/60"
          open={defaultOpenIndex >= 0 && idx === defaultOpenIndex}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-base font-semibold text-white transition-colors hover:text-cyan-200">
            <span>{item.q}</span>
            <span
              aria-hidden
              className="text-lg text-slate-400 transition-transform group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <div className="px-5 pb-5 text-slate-300">
            <div className="leading-relaxed [&_a]:text-cyan-300 [&_a:hover]:text-cyan-200 [&_p+p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
              {item.a}
            </div>
            {item.steps && item.steps.length > 0 && (
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed">
                {item.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            )}
            {item.footer && (
              <div className="mt-4 text-sm leading-relaxed text-slate-400 [&_a]:text-cyan-300 [&_a:hover]:text-cyan-200">
                {item.footer}
              </div>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}
