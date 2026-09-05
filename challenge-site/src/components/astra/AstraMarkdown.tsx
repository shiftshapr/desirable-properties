'use client';

import { useMemo, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AstraChapterImage from '@/components/astra/AstraChapterImage';

export function useAstraMarkdownComponents(): Record<string, unknown> {
  return useMemo(
    () => ({
      p: ({ children }: { children?: ReactNode }) => (
        <p className="mb-3 last:mb-0 text-slate-300">{children}</p>
      ),
      strong: ({ children }: { children?: ReactNode }) => (
        <strong className="font-semibold text-white">{children}</strong>
      ),
      em: ({ children }: { children?: ReactNode }) => (
        <em className="italic">{children}</em>
      ),
      ul: ({ children }: { children?: ReactNode }) => (
        <ul className="mb-3 list-disc space-y-1 pl-5 text-slate-300">{children}</ul>
      ),
      ol: ({ children }: { children?: ReactNode }) => (
        <ol className="mb-3 list-decimal space-y-1 pl-5 text-slate-300">{children}</ol>
      ),
      li: ({ children }: { children?: ReactNode }) => (
        <li className="leading-relaxed">{children}</li>
      ),
      h1: ({ children }: { children?: ReactNode }) => (
        <h1 className="mb-2 mt-1 text-lg font-semibold text-white">{children}</h1>
      ),
      h2: ({ children }: { children?: ReactNode }) => (
        <h2 className="mb-2 mt-3 text-base font-semibold text-white">{children}</h2>
      ),
      h3: ({ children }: { children?: ReactNode }) => (
        <h3 className="mb-2 mt-3 text-sm font-semibold text-white">{children}</h3>
      ),
      a: ({ href, children }: { href?: string; children?: ReactNode }) => (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-300 underline underline-offset-2 hover:text-cyan-200"
        >
          {children}
        </a>
      ),
      code: ({ children }: { children?: ReactNode }) => (
        <code className="rounded bg-slate-800 px-1 py-0.5 text-cyan-200">{children}</code>
      ),
      blockquote: ({ children }: { children?: ReactNode }) => (
        <blockquote className="my-3 border-l-2 border-cyan-700 pl-3 italic text-slate-300">
          {children}
        </blockquote>
      ),
      hr: () => <hr className="my-3 border-slate-700" />,
      img: ({ src, alt }: { src?: string; alt?: string }) => (
        <AstraChapterImage src={src} alt={alt} />
      ),
    }),
    [],
  );
}

type AstraMarkdownProps = {
  markdown: string;
  className?: string;
};

/** Render Astra / member-edit chapter markdown with consistent challenge-site styling. */
export default function AstraMarkdown({ markdown, className = '' }: AstraMarkdownProps) {
  const components = useAstraMarkdownComponents();
  if (!markdown.trim()) return null;
  return (
    <div className={`select-text text-sm leading-relaxed ${className}`.trim()}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
