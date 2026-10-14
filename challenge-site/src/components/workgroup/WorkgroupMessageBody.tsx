'use client';

import HermesMarkdown from '@/components/HermesMarkdown';
import { isSharedHermesWorkgroupMessage } from '@/lib/workgroup-hermes-share';
import { RelayMessageContent } from '@/lib/workgroup-relay-message';

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
};

export default function WorkgroupMessageBody({ body, className = '', relay = null }: Props) {
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

  if (isSharedHermesWorkgroupMessage(body)) {
    return (
      <div className={`mt-1 text-sm leading-relaxed ${className}`.trim()}>
        <HermesMarkdown text={body} variant="dark" />
      </div>
    );
  }

  return (
    <p className={`mt-1 whitespace-pre-wrap text-sm leading-relaxed ${className || 'text-slate-200'}`.trim()}>
      {body}
    </p>
  );
}
