import Image from 'next/image';
import type { Element } from 'hast';
import { isValidElement, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function headingText(children: ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(headingText).join('');
  if (isValidElement(children)) return headingText(children.props.children);
  return '';
}

/** Known dimensions for perspective inline images (avoids layout shift). */
const PERSPECTIVE_IMAGE_DIMS: Record<string, { width: number; height: number }> = {
  'ai-inhabitant-not-landlord.webp': { width: 1586, height: 992 },
  'concierge-vs-commons.webp': { width: 1600, height: 900 },
  'human-centered-layered-web.webp': { width: 1600, height: 900 },
  'intellectual-sovereignty-subsidiarity.webp': { width: 1536, height: 1024 },
  'intelligence-is-not-a-place.webp': { width: 1586, height: 992 },
  'privatization-of-context.webp': { width: 1586, height: 992 },
  'second-fork-closing.webp': { width: 1576, height: 998 },
  'space-for-layers.webp': { width: 1536, height: 1024 },
  'you-ai-everything-else.webp': { width: 1586, height: 992 },
};

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
          p: ({ children, node }) => {
            const isImageOnly =
              node?.children?.length === 1 &&
              node.children[0].type === 'element' &&
              (node.children[0] as Element).tagName === 'img';
            if (isImageOnly) {
              return <>{children}</>;
            }
            return <p className="mb-5 last:mb-0">{children}</p>;
          },
          strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-slate-200">{children}</em>,
          h2: ({ children }) => {
            const id = slugifyHeading(headingText(children));
            return (
              <h2
                id={id}
                className="mb-5 mt-12 border-b border-slate-800 pb-2 text-2xl font-bold text-white first:mt-0"
              >
                {children}
              </h2>
            );
          },
          h3: ({ children }) => {
            const id = slugifyHeading(headingText(children));
            return (
              <h3 id={id} className="mb-4 mt-10 text-xl font-semibold text-white">
                {children}
              </h3>
            );
          },
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
          img: ({ src, alt, title }) => {
            const srcStr = typeof src === 'string' ? src : '';
            const filename = srcStr.split('/').pop() ?? '';
            const dims = PERSPECTIVE_IMAGE_DIMS[filename];
            const caption = typeof title === 'string' && title.trim() ? title.trim() : null;

            if (dims) {
              const colonIdx = caption ? caption.indexOf(':') : -1;
              const captionLead =
                caption && colonIdx > 0 ? caption.slice(0, colonIdx + 1) : null;
              const captionRest =
                caption && colonIdx > 0 ? caption.slice(colonIdx + 1).trimStart() : caption;

              return (
                <figure className="my-8">
                  <Image
                    src={srcStr}
                    alt={alt ?? ''}
                    width={dims.width}
                    height={dims.height}
                    className="h-auto w-full rounded-lg border border-slate-800"
                    sizes="(max-width: 768px) 100vw, 768px"
                  />
                  {caption ? (
                    <figcaption className="mt-3 text-sm leading-relaxed text-slate-400 sm:text-base">
                      {captionLead ? (
                        <strong className="font-semibold text-slate-200">{captionLead}</strong>
                      ) : null}{' '}
                      {captionRest}
                    </figcaption>
                  ) : null}
                </figure>
              );
            }

            return (
              <figure className="my-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={srcStr}
                  alt={alt ?? ''}
                  title={title}
                  className="w-full rounded-lg border border-slate-800"
                  loading="lazy"
                />
                {caption ? (
                  <figcaption className="mt-3 text-sm leading-relaxed text-slate-400 sm:text-base">
                    {caption}
                  </figcaption>
                ) : null}
              </figure>
            );
          },
          hr: () => <hr className="my-10 border-slate-800" />,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
