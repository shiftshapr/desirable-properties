'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

/** Chapter images use paths relative to the book site, where the files live (BRC333 book repo). */
const BOOK_ORIGIN = 'https://book.desirableproperties.org';
const bookAsset = (src: string) => (src.startsWith('/') && !src.startsWith('//') ? `${BOOK_ORIGIN}${src}` : src);

const MD: Components = {
  h1: ({ children }) => <h1 className="mb-4 mt-2 text-2xl font-semibold text-white">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-3 mt-8 text-xl font-semibold text-white">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-2 mt-6 text-lg font-semibold text-slate-100">{children}</h3>,
  h4: ({ children }) => <h4 className="mb-2 mt-5 font-semibold text-slate-100">{children}</h4>,
  p: ({ children }) => <p className="my-3 leading-7 text-slate-200">{children}</p>,
  ul: ({ children }) => <ul className="my-3 list-disc space-y-1 pl-6 text-slate-200">{children}</ul>,
  ol: ({ children }) => <ol className="my-3 list-decimal space-y-1 pl-6 text-slate-200">{children}</ol>,
  li: ({ children }) => <li className="leading-7">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  hr: () => <hr className="my-6 border-slate-700" />,
  blockquote: ({ children }) => <blockquote className="my-4 border-l-2 border-slate-600 pl-4 text-slate-300">{children}</blockquote>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-cyan-300 underline hover:text-cyan-200">
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto">
      <table className="min-w-full border-collapse text-sm text-slate-200">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-slate-700 px-2 py-1 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border border-slate-700 px-2 py-1 align-top">{children}</td>,
  code: ({ children }) => <code className="rounded bg-slate-800 px-1 text-sm">{children}</code>,
  img: ({ src, alt }) =>
    typeof src === 'string' ? <img src={bookAsset(src)} alt={alt || ''} className="my-4 max-w-full rounded" /> : null,
};

/**
 * The document's current text, exactly as Gov Hub holds it now (every accepted change applied): the text a
 * Stage 4 sign-off is tied to. Gov Hub's own "read" page shows the last published version instead.
 */
export default function FinalText({ ml, version }: { ml: string; version: string | null }) {
  const [open, setOpen] = useState(true);
  const [source, setSource] = useState(false);
  const [raw, setRaw] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    fetch(`/api/steering/${encodeURIComponent(ml)}/text`, { cache: 'no-store' })
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as { markdown?: string; error?: string };
        if (!res.ok || typeof body.markdown !== 'string') throw new Error(body.error || `Text unavailable (${res.status})`);
        if (live) {
          setRaw(body.markdown);
          setText(body.markdown.replace(/<!--[\s\S]*?-->/g, '').trim());
        }
      })
      .catch((err) => live && setError(err instanceof Error ? err.message : 'Text unavailable'));
    return () => {
      live = false;
    };
  }, [ml, version]);

  return (
    <section id="text" className="scroll-mt-24 rounded-2xl border border-slate-700 bg-slate-950/40">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-800 px-4 py-3">
        <h2 className="text-base font-semibold text-white">Final text</h2>
        <p className="min-w-0 flex-1 text-xs text-slate-400">
          The working revision exactly as it stands: what you sign, what Publish turns into the next Gov Hub revision, and
          what the BRC333 book and the Desirable Properties book copy from it (they add only a sync comment and local image
          paths). Changes made in Stage 4 are listed under the Accepted tab below.
        </p>
        <div className="flex gap-1 text-xs" role="tablist" aria-label="Text view">
          {[
            { k: false, label: 'Reading view' },
            { k: true, label: 'Exact source' },
          ].map((t) => (
            <button
              key={t.label}
              type="button"
              role="tab"
              aria-selected={source === t.k}
              onClick={() => setSource(t.k)}
              className={`rounded px-2 py-1 ${source === t.k ? 'bg-slate-700 text-white' : 'text-slate-300 hover:text-white'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} className="text-xs text-cyan-300 underline hover:text-cyan-200">
          {open ? 'Hide' : 'Show'}
        </button>
      </header>
      {open ? (
        <div className="max-h-[75vh] overflow-y-auto px-4 py-4 sm:px-6">
          {error ? <p className="text-sm text-rose-200">{error}</p> : null}
          {!text && !error ? <p className="text-sm text-slate-400">Loading the text…</p> : null}
          {source && raw ? (
            <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-6 text-slate-200">{raw}</pre>
          ) : null}
          {!source && text ? (
            <article className="max-w-3xl">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>
                {text}
              </ReactMarkdown>
            </article>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
