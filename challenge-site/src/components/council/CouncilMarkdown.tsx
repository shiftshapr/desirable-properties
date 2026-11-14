import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** Markdown from Gov Hub (purpose, announcements, statements), styled for the dark theme. No raw HTML. */
export default function CouncilMarkdown({ text, className = '' }: { text: string | null | undefined; className?: string }) {
  if (!text?.trim()) return null;
  return (
    <div
      className={`space-y-3 leading-relaxed text-slate-300 [&_a]:text-cyan-300 [&_a]:underline hover:[&_a]:text-cyan-200 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:text-white [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-white [&_h3]:font-semibold [&_h3]:text-white [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:text-white [&_ul]:list-disc [&_ul]:pl-5 ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} rel="noopener noreferrer nofollow" target={href?.startsWith('/') ? undefined : '_blank'}>
              {children}
            </a>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
