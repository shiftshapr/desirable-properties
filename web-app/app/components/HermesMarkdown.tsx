'use client';

import ReactMarkdown from 'react-markdown';

type HermesMarkdownProps = {
  text: string;
  variant?: 'dark' | 'light';
};

const linkClass = {
  dark: 'text-cyan-300 underline underline-offset-2 hover:text-cyan-200',
  light: 'text-blue-700 underline underline-offset-2 hover:text-blue-800',
};

export default function HermesMarkdown({ text, variant = 'light' }: HermesMarkdownProps) {
  const muted = variant === 'dark' ? 'text-slate-300' : 'text-gray-800';
  const strong = variant === 'dark' ? 'font-semibold text-white' : 'font-semibold text-gray-900';
  const code = variant === 'dark'
    ? 'rounded bg-slate-800 px-1 py-0.5 text-cyan-200'
    : 'rounded bg-gray-200 px-1 py-0.5 text-gray-900';

  return (
    <ReactMarkdown
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
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass[variant]}>
            {children}
          </a>
        ),
        code: ({ children }) => <code className={code}>{children}</code>,
        blockquote: ({ children }) => (
          <blockquote className={`my-3 border-l-2 border-gray-300 pl-3 italic ${muted}`}>{children}</blockquote>
        ),
        hr: () => <hr className="my-3 border-gray-300" />,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}
