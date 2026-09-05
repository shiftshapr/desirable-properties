'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import sanitizeHtml from 'sanitize-html';

export type AstraViewerContent =
  | { kind: 'markdown'; title: string; markdown: string; downloadFilename?: string }
  | { kind: 'json'; title: string; data: unknown; downloadFilename?: string };

type Props = {
  open: boolean;
  content: AstraViewerContent | null;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
};

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function MarkdownBody({ markdown }: { markdown: string }) {
  const sanitized = useMemo(
    () =>
      sanitizeHtml(markdown, {
        allowedTags: [],
        allowedAttributes: {},
      }),
    [markdown],
  );

  const muted = 'text-slate-300';
  const strong = 'font-semibold text-white';
  const code = 'rounded bg-slate-800 px-1 py-0.5 text-cyan-200 text-[0.9em]';
  const tableBorder = 'border-slate-700';
  const tableHead = 'bg-slate-800/80 text-slate-100';

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className={`mb-3 last:mb-0 ${muted}`}>{children}</p>,
        strong: ({ children }) => <strong className={strong}>{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        ul: ({ children }) => <ul className={`mb-3 list-disc space-y-1 pl-5 ${muted}`}>{children}</ul>,
        ol: ({ children }) => <ol className={`mb-3 list-decimal space-y-1 pl-5 ${muted}`}>{children}</ol>,
        li: ({ children }) => <li className={muted}>{children}</li>,
        h1: ({ children }) => <h3 className="mb-3 text-lg font-semibold text-white">{children}</h3>,
        h2: ({ children }) => <h4 className="mb-2 mt-4 text-base font-semibold text-white">{children}</h4>,
        h3: ({ children }) => <h5 className="mb-2 mt-3 text-sm font-semibold text-slate-100">{children}</h5>,
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-300 underline underline-offset-2 hover:text-cyan-200"
          >
            {children}
          </a>
        ),
        code: ({ children }) => <code className={code}>{children}</code>,
        pre: ({ children }) => (
          <pre className="mb-3 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-xs text-slate-200">
            {children}
          </pre>
        ),
        table: ({ children }) => (
          <div className="mb-3 overflow-x-auto">
            <table className={`w-full border-collapse text-sm ${muted}`}>{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className={tableHead}>{children}</thead>,
        th: ({ children }) => (
          <th className={`border ${tableBorder} px-3 py-2 text-left font-medium`}>{children}</th>
        ),
        td: ({ children }) => <td className={`border ${tableBorder} px-3 py-2 align-top`}>{children}</td>,
        blockquote: ({ children }) => (
          <blockquote className="mb-3 border-l-2 border-violet-600/60 pl-4 text-slate-400">{children}</blockquote>
        ),
      }}
    >
      {sanitized}
    </ReactMarkdown>
  );
}

export default function AstraContentViewerModal({
  open,
  content,
  loading = false,
  error = null,
  onClose,
}: Props) {
  const titleId = useId();
  const descId = useId();

  const handleDownload = useCallback(() => {
    if (!content) return;
    if (content.kind === 'markdown') {
      downloadBlob(
        content.downloadFilename || 'document.md',
        new Blob([content.markdown], { type: 'text/markdown;charset=utf-8' }),
      );
      return;
    }
    downloadBlob(
      content.downloadFilename || 'document.json',
      new Blob([`${JSON.stringify(content.data, null, 2)}\n`], { type: 'application/json;charset=utf-8' }),
    );
  }, [content]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10002] flex items-center justify-center bg-slate-950/80 p-5"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
          <h2 id={titleId} className="text-lg font-semibold text-white">
            {content?.title || 'Loading…'}
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            {content ? (
              <button
                type="button"
                onClick={handleDownload}
                className="rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
              >
                Download
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        </div>

        <div id={descId} className="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-sm leading-relaxed">
          {loading ? <p className="text-slate-400">Loading…</p> : null}
          {error ? (
            <p className="rounded-lg border border-rose-800/60 bg-rose-950/30 px-3 py-2 text-rose-200">
              {error}
            </p>
          ) : null}
          {!loading && !error && content?.kind === 'markdown' ? (
            <MarkdownBody markdown={content.markdown} />
          ) : null}
          {!loading && !error && content?.kind === 'json' ? (
            <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-slate-800 bg-slate-950/80 p-4 text-xs text-slate-200">
              {JSON.stringify(content.data, null, 2)}
            </pre>
          ) : null}
        </div>
      </div>
    </div>
  );
}
