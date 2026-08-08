import ReactMarkdown from 'react-markdown';

type Props = {
  markdown: string;
};

/**
 * Essay-oriented markdown renderer. Preserves paragraph cadence; does not
 * restyle content into cards or dashboards.
 */
export default function PerspectiveBody({ markdown }: Props) {
  return (
    <div className="perspective-essay mt-10 text-lg leading-relaxed text-slate-300">
      <ReactMarkdown
        components={{
          p: ({ children }) => (
            <p className="mb-5 last:mb-0">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-slate-200">{children}</em>,
          h2: ({ children }) => (
            <h2 className="mb-5 mt-12 border-b border-slate-800 pb-2 text-2xl font-bold text-white first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-4 mt-10 text-xl font-semibold text-white">{children}</h3>
          ),
          ul: ({ children }) => (
            <ul className="mb-5 list-disc space-y-2 pl-6">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-5 list-decimal space-y-2 pl-6">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
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
          blockquote: ({ children }) => (
            <blockquote className="my-6 border-l-2 border-cyan-700/80 pl-4 text-slate-200">
              {children}
            </blockquote>
          ),
          img: ({ src, alt }) => (
            <figure className="my-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={alt ?? ''}
                className="w-full rounded-lg border border-slate-800"
                loading="lazy"
              />
            </figure>
          ),
          hr: () => <hr className="my-10 border-slate-800" />,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
