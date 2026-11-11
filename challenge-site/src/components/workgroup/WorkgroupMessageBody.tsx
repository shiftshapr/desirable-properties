'use client';

import HermesMarkdown from '@/components/HermesMarkdown';
import { isSharedHermesWorkgroupMessage } from '@/lib/workgroup-hermes-share';
import { MessageAttachmentList, RelayMessageContent } from '@/lib/workgroup-relay-message';
import type { ReactNode } from 'react';

// http(s) links and bare "www." links; trailing punctuation stays outside the link.
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;
const TRAILING = /[.,;:!?)\]}'"]+$/;

/** Plain chat text with its links made clickable (opened in a new tab). */
export function linkifyText(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    let url = m[0];
    const trail = url.match(TRAILING)?.[0] ?? '';
    // Keep a closing parenthesis that belongs to the URL, e.g. Wikipedia links.
    const keepParen = trail.startsWith(')') && url.includes('(');
    if (trail && !keepParen) url = url.slice(0, -trail.length);
    const start = m.index ?? 0;
    if (start > last) out.push(text.slice(last, start));
    const href = url.toLowerCase().startsWith('www.') ? `https://${url}` : url;
    out.push(
      <a
        key={`${start}-${url}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="break-all text-cyan-300 underline underline-offset-2 hover:text-cyan-200"
      >
        {url}
      </a>,
    );
    last = start + url.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Props = {
  body: string;
  /** Extra classes on the outer wrapper (plain-text `<p>` or markdown `<div>`). */
  className?: string;
  /** Set for email-relay messages: sanitized markdown body plus attachments. */
  relay?: {
    workgroupId: string;
    messageId: string;
    attachments?: unknown;
  } | null;
  /** Files a member attached to an ordinary chat message. */
  files?: {
    workgroupId: string;
    messageId: string;
    attachments?: unknown;
  } | null;
};

export default function WorkgroupMessageBody({ body, className = '', relay = null, files = null }: Props) {
  if (relay) {
    return (
      <RelayMessageContent
        workgroupId={relay.workgroupId}
        messageId={relay.messageId}
        body={body}
        attachments={relay.attachments}
      />
    );
  }

  const attachmentList = files ? <MessageAttachmentList {...files} /> : null;

  if (isSharedHermesWorkgroupMessage(body)) {
    return (
      <div className={`mt-1 text-sm leading-relaxed ${className}`.trim()}>
        <HermesMarkdown text={body} variant="dark" />
        {attachmentList}
      </div>
    );
  }

  return (
    <>
      {body ? (
        <p className={`mt-1 whitespace-pre-wrap text-sm leading-relaxed ${className || 'text-slate-200'}`.trim()}>
          {linkifyText(body)}
        </p>
      ) : null}
      {attachmentList}
    </>
  );
}
