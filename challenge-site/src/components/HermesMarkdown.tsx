'use client';

import { useCallback, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DpReferenceModal from '@/components/DpReferenceModal';

type HermesMarkdownProps = {
  text: string;
  variant?: 'dark' | 'light';
};

const linkClass = {
  dark: 'text-cyan-300 underline underline-offset-2 hover:text-cyan-200',
  light: 'text-blue-700 underline underline-offset-2 hover:text-blue-800',
};

const sourcePillClass = {
  dark:
    'mx-0.5 inline-flex cursor-pointer rounded-full border border-cyan-700/50 bg-slate-800/80 px-1.5 py-0.5 text-[10px] font-medium text-cyan-200 align-middle transition hover:border-cyan-500 hover:bg-cyan-950/50 hover:text-cyan-100',
  light:
    'mx-0.5 inline-flex cursor-pointer rounded-full border border-blue-300 bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-800 align-middle transition hover:border-blue-400 hover:bg-blue-50',
};

/** Normalize Hermes citation tokens into source-pill link targets. */
function preprocessHermesMarkdown(text: string): string {
  let out = String(text || '');
  // Bare web:hostname tokens → source pills
  out = out.replace(
    /\bweb:([a-z0-9][-a-z0-9.]*\.[a-z]{2,})\b/gi,
    '[web:$1](#hermes-source)',
  );
  // Bracket labels without a link target → source pills
  out = out.replace(/\[([^\]\n]{1,120})\](?!\()/g, '[$1](#hermes-source)');
  return out;
}

export default function HermesMarkdown({ text, variant = 'dark' }: HermesMarkdownProps) {
  const [activeRefLabel, setActiveRefLabel] = useState<string | null>(null);
  const closeRefModal = useCallback(() => setActiveRefLabel(null), []);

  const muted = variant === 'dark' ? 'text-slate-300' : 'text-gray-700';
  const strong = variant === 'dark' ? 'font-semibold text-white' : 'font-semibold text-gray-900';
  const code = variant === 'dark'
    ? 'rounded bg-slate-800 px-1 py-0.5 text-cyan-200'
    : 'rounded bg-gray-200 px-1 py-0.5 text-gray-900';
  const tableBorder = variant === 'dark' ? 'border-slate-700' : 'border-gray-300';
  const tableHead = variant === 'dark' ? 'bg-slate-800/80 text-slate-100' : 'bg-gray-100 text-gray-900';

  return (
    <>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className={`mb-3 last:mb-0 ${muted}`}>{children}</p>,
          strong: ({ children }) => <strong className={strong}>{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => <ul className={`mb-3 list-disc space-y-1 pl-5 ${muted}`}>{children}</ul>,
          ol: ({ children }) => <ol className={`mb-3 list-decimal space-y-1 pl-5 ${muted}`}>{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          h1: ({ children }) => <h1 className={`mb-2 mt-1 text-lg font-semibold ${strong}`}>{children}</h1>,
          h2: ({ children }) => <h2 className={`mb-2 mt-3 text-base font-semibold ${strong}`}>{children}</h2>,
          h3: ({ children }) => <h3 className={`mb-2 mt-3 text-sm font-semibold ${strong}`}>{children}</h3>,
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto">
              <table className={`w-full min-w-[320px] border-collapse text-sm ${muted}`}>{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className={tableHead}>{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className={`border-b ${tableBorder}`}>{children}</tr>,
          th: ({ children }) => (
            <th className={`border ${tableBorder} px-2 py-1.5 text-left font-semibold ${strong}`}>{children}</th>
          ),
          td: ({ children }) => (
            <td className={`border ${tableBorder} px-2 py-1.5 align-top`}>{children}</td>
          ),
          a: ({ href, children }) => {
            if (href === '#hermes-source') {
              const label = String(children ?? '').trim();
              return (
                <button
                  type="button"
                  className={sourcePillClass[variant]}
                  title="View source details"
                  onClick={() => setActiveRefLabel(label)}
                >
                  {children}
                </button>
              );
            }
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass[variant]}>
                {children}
              </a>
            );
          },
          code: ({ children }) => <code className={code}>{children}</code>,
          blockquote: ({ children }) => (
            <blockquote className={`my-3 border-l-2 border-cyan-700 pl-3 italic ${muted}`}>{children}</blockquote>
          ),
          hr: () => <hr className="my-3 border-slate-700" />,
        }}
      >
        {preprocessHermesMarkdown(text)}
      </ReactMarkdown>

      <DpReferenceModal
        open={activeRefLabel !== null}
        label={activeRefLabel}
        onClose={closeRefModal}
      />
    </>
  );
}
