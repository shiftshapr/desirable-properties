import fs from 'node:fs';
import path from 'node:path';
import Link from 'next/link';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * The DP Chapter Format Guide, rendered from docs/DP-FORMAT-GUIDE.md so the page and the doc never
 * drift apart. Read at build time (static page); the build fails if the doc is missing.
 */
export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Format guide – Desirable Properties',
  description:
    'What a Desirable Property chapter contains: the required sections, the optional ones and when to include them, and when a chapter has earned a section of its own.',
};

const DOC_PATH = path.join(process.cwd(), '..', 'docs', 'DP-FORMAT-GUIDE.md');
const REPO_BLOB = 'https://github.com/shiftshapr/desirable-properties/blob/main/';

/** Repo-relative links in the doc (to the template, the matrix, bundle specs) point at GitHub. */
function resolveHref(href: string): string {
  if (/^([a-z]+:|#|\/)/i.test(href)) return href;
  const target = path.posix.normalize(path.posix.join('docs', href));
  return REPO_BLOB + target.replace(/^(\.\.\/)+/, '');
}

function slug(children: ReactNode): string {
  const text = (Array.isArray(children) ? children : [children])
    .map((c) => (typeof c === 'string' || typeof c === 'number' ? String(c) : ''))
    .join('');
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function FormatGuidePage() {
  const doc = fs.readFileSync(DOC_PATH, 'utf8');
  // The page header carries the title; drop the doc's own H1.
  const body = doc.replace(/^# .*\n+/, '');

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <Link href="/style-guide" className="text-sm text-cyan-300 hover:text-cyan-200">
        ← Style guide
      </Link>
      <header className="mt-6 border-b border-slate-800 pb-8">
        <p className="text-sm font-medium uppercase tracking-[0.15em] text-cyan-400">
          Desirable Properties · Version 1.0
        </p>
        <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">Format guide</h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-300">
          What a chapter contains: the sections every chapter has, the ones to include when they fit, and
          when a chapter has earned a section of its own. The style guide covers how to write; this guide
          covers what goes where.
        </p>
      </header>

      <article className="mt-8 select-text text-slate-300">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h2: ({ children }) => (
              <h2 id={slug(children)} className="mt-12 scroll-mt-20 border-t border-slate-800 pt-8 text-2xl font-bold text-white">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 id={slug(children)} className="mt-8 scroll-mt-20 text-lg font-semibold text-white">
                {children}
              </h3>
            ),
            p: ({ children }) => <p className="mt-3 max-w-3xl leading-relaxed">{children}</p>,
            strong: ({ children }) => <strong className="font-semibold text-slate-100">{children}</strong>,
            ul: ({ children }) => <ul className="mt-3 max-w-3xl list-disc space-y-1.5 pl-6">{children}</ul>,
            ol: ({ children }) => <ol className="mt-3 max-w-3xl list-decimal space-y-1.5 pl-6">{children}</ol>,
            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
            a: ({ href, children }) => {
              const to = resolveHref(href ?? '');
              const external = /^https?:/i.test(to);
              return (
                <a
                  href={to}
                  className="text-cyan-300 underline-offset-2 hover:text-cyan-200 hover:underline"
                  {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  {children}
                </a>
              );
            },
            table: ({ children }) => (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-sm">{children}</table>
              </div>
            ),
            thead: ({ children }) => <thead className="bg-slate-900/80 text-slate-100">{children}</thead>,
            tr: ({ children }) => <tr className="border-b border-slate-800">{children}</tr>,
            th: ({ children }) => (
              <th className="border border-slate-800 px-3 py-2 text-left font-semibold">{children}</th>
            ),
            td: ({ children }) => <td className="border border-slate-800 px-3 py-2 align-top">{children}</td>,
            pre: ({ children }) => (
              <pre className="mt-4 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/80 p-4 text-xs leading-relaxed text-slate-200 [&_code]:bg-transparent [&_code]:p-0">
                {children}
              </pre>
            ),
            code: ({ children }) => (
              <code className="rounded bg-slate-800/70 px-1 py-0.5 text-[0.9em] text-slate-100">{children}</code>
            ),
            hr: () => null,
          }}
        >
          {body}
        </ReactMarkdown>
      </article>

      <p className="mt-12 text-sm text-slate-400">
        Questions, or a rule that does not work for your chapter? Raise it at the Monday session or in your
        workgroup chat.
      </p>
    </main>
  );
}
