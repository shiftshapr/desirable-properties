/**
 * Email-relay workgroup messages (Gov Hub `source_channel: 'email-relay'`): notes a
 * reviewer sent by email, posted under their name with any attachments.
 *
 * Built with `createElement` and no `@/` imports so
 * `scripts/workgroup-relay-message.test.mjs` can render it with
 * `node --experimental-strip-types`.
 */
import { createElement as h, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const EMAIL_RELAY_SOURCE_CHANNEL = 'email-relay';

export type WorkgroupMessageAttachment = {
  id: string;
  filename: string;
  size: number | null;
  url: string | null;
};

export function isEmailRelayMessage(
  msg: { source_channel?: string | null } | null | undefined,
): boolean {
  return String(msg?.source_channel ?? '').trim() === EMAIL_RELAY_SOURCE_CHANNEL;
}

/** "512 B", "14 KB", "2.3 MB". Empty string when the size is unknown. */
export function formatAttachmentSize(bytes: number | null | undefined): string {
  if (bytes == null) return '';
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) return '';
  if (n < 1024) return `${Math.round(n)} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

/** Keep attachment rows that have an id or a filename; coerce field types. */
export function normalizeRelayAttachments(raw: unknown): WorkgroupMessageAttachment[] {
  if (!Array.isArray(raw)) return [];
  const out: WorkgroupMessageAttachment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const id = String(row.id ?? '').trim();
    const filename = String(row.filename ?? '').trim();
    if (!id && !filename) continue;
    const size = row.size == null ? null : Number(row.size);
    out.push({
      id,
      filename: filename || 'attachment',
      size: Number.isFinite(size) ? size : null,
      url: row.url == null ? null : String(row.url),
    });
  }
  return out;
}

/**
 * Download link for an attachment. Gov Hub serves files with the message's visibility
 * (members only), so the browser goes through this site's proxy at the same path, which
 * forwards the session token. Falls back to the given url only when it is an http(s) or
 * site-relative link.
 */
export function relayAttachmentHref(
  workgroupId: string,
  messageId: string,
  attachment: WorkgroupMessageAttachment,
): string | null {
  if (workgroupId && messageId && attachment.id) {
    return `/api/workgroups/${encodeURIComponent(workgroupId)}/messages/${encodeURIComponent(
      messageId,
    )}/attachments/${encodeURIComponent(attachment.id)}`;
  }
  const url = String(attachment.url ?? '').trim();
  if (/^https?:\/\//i.test(url) || (url.startsWith('/') && !url.startsWith('//'))) return url;
  return null;
}

const muted = 'text-slate-300';
const strongClass = 'font-semibold text-white';
const linkClass = 'text-cyan-300 underline underline-offset-2 hover:text-cyan-200';

const relayComponents: Components = {
  p: ({ children }) => h('p', { className: `mb-3 last:mb-0 ${muted}` }, children),
  strong: ({ children }) => h('strong', { className: strongClass }, children),
  em: ({ children }) => h('em', { className: 'italic' }, children),
  ul: ({ children }) => h('ul', { className: `mb-3 list-disc space-y-1 pl-5 ${muted}` }, children),
  ol: ({ children }) => h('ol', { className: `mb-3 list-decimal space-y-1 pl-5 ${muted}` }, children),
  li: ({ children }) => h('li', { className: 'leading-relaxed' }, children),
  h1: ({ children }) => h('h3', { className: `mb-2 mt-1 text-base ${strongClass}` }, children),
  h2: ({ children }) => h('h3', { className: `mb-2 mt-3 text-sm ${strongClass}` }, children),
  h3: ({ children }) => h('h3', { className: `mb-2 mt-3 text-sm ${strongClass}` }, children),
  a: ({ href, children }) =>
    h('a', { href, target: '_blank', rel: 'noopener noreferrer', className: linkClass }, children),
  code: ({ children }) => h('code', { className: 'rounded bg-slate-800 px-1 py-0.5 text-cyan-200' }, children),
  blockquote: ({ children }) =>
    h('blockquote', { className: `my-3 border-l-2 border-cyan-700 pl-3 italic ${muted}` }, children),
  hr: () => h('hr', { className: 'my-3 border-slate-700' }),
  // No remote loads from email content: an image shows as its alt text only.
  img: ({ alt }) => (alt ? h('span', { className: 'italic text-slate-400' }, `[image: ${alt}]`) : null),
};

/**
 * Markdown for relayed email notes, on the same renderer as shared Hermes messages
 * (react-markdown + remark-gfm). Raw HTML is dropped, not shown; images are reduced to
 * their alt text (no remote loads from email content); react-markdown's default URL
 * filter removes `javascript:` and other unsafe link targets.
 */
export function relayMarkdown(text: string): ReactNode {
  return h(ReactMarkdown, {
    remarkPlugins: [remarkGfm],
    skipHtml: true,
    components: relayComponents,
    children: String(text ?? ''),
  });
}

/** Body, "via email" label and attachment list for an email-relay message. */
export function RelayMessageContent(props: {
  workgroupId: string;
  messageId: string;
  body: string;
  attachments?: unknown;
}): ReactNode {
  const attachments = normalizeRelayAttachments(props.attachments);
  return h(
    'div',
    { className: 'mt-1 text-sm leading-relaxed', 'data-relay': 'email' },
    h('div', { className: 'select-text' }, relayMarkdown(props.body)),
    attachments.length
      ? h(
          'ul',
          { className: 'mt-2 space-y-1', 'aria-label': 'Attachments' },
          attachments.map((att, i) => {
            const href = relayAttachmentHref(props.workgroupId, props.messageId, att);
            const size = formatAttachmentSize(att.size);
            const label = h('span', { className: 'break-all' }, att.filename);
            return h(
              'li',
              { key: att.id || `${att.filename}-${i}`, className: 'flex items-baseline gap-2 text-xs' },
              href
                ? h('a', { href, target: '_blank', rel: 'noopener noreferrer', className: linkClass, download: att.filename }, label)
                : h('span', { className: 'text-slate-300' }, label),
              size ? h('span', { className: 'text-slate-500' }, size) : null,
            );
          }),
        )
      : null,
  );
}

/** Small label shown next to the author of an email-relay message. */
export function ViaEmailLabel(): ReactNode {
  return h(
    'span',
    {
      className:
        'rounded-full border border-slate-600 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400',
      title: 'Sent by email and posted here under their name',
    },
    'via email',
  );
}

/** Author name; links to the Canopi profile when one was resolved. */
export function RelayAuthorName(props: { name: string; profileUrl?: string | null }): ReactNode {
  const name = props.name || 'Member';
  const url = String(props.profileUrl ?? '').trim();
  if (!/^https?:\/\//i.test(url)) {
    return h('span', { className: 'text-sm font-medium text-cyan-200' }, name);
  }
  return h(
    'a',
    {
      href: url,
      target: '_blank',
      rel: 'noopener noreferrer',
      className: 'text-sm font-medium text-cyan-200 underline-offset-2 hover:underline',
      title: 'Canopi profile',
    },
    name,
  );
}

/**
 * Author line for any chat message (member chat and signed-out teaser). Email-relay
 * messages get the Canopi profile link and the "via email" label; others render the
 * plain name exactly as before.
 */
export function WorkgroupMessageAuthor(props: {
  message: {
    author_name?: string | null;
    source_channel?: string | null;
    author_canopi_profile_url?: string | null;
  };
}): ReactNode {
  const name = props.message.author_name || 'Member';
  if (!isEmailRelayMessage(props.message)) {
    return h('span', { className: 'text-sm font-medium text-cyan-200' }, name);
  }
  return h(
    'span',
    { className: 'flex min-w-0 items-baseline gap-2' },
    h(RelayAuthorName, { name, profileUrl: props.message.author_canopi_profile_url }),
    h(ViaEmailLabel),
  );
}
