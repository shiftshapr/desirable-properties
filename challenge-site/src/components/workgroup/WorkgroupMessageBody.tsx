'use client';

import HermesMarkdown from '@/components/HermesMarkdown';
import { isSharedHermesWorkgroupMessage } from '@/lib/workgroup-hermes-share';

type Props = {
  body: string;
  /** Extra classes on the outer wrapper (plain-text `<p>` or markdown `<div>`). */
  className?: string;
};

export default function WorkgroupMessageBody({ body, className = '' }: Props) {
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
