'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import UserDateTime from '@/components/UserDateTime';
import WorkgroupMessageBody from '@/components/workgroup/WorkgroupMessageBody';
import type { WorkgroupMessage } from '@/lib/workgroup-collab-types';
import { teaserFocusState, workgroupMessageAnchorId } from '@/lib/workgroup-message-permalink';
import { isEmailRelayMessage, WorkgroupMessageAuthor } from '@/lib/workgroup-relay-message';

type Props = {
  messages: WorkgroupMessage[];
  joinHref: string;
  workgroupName: string;
  /** When true, omit the join CTA (member view). */
  isMember?: boolean;
  /** Workgroup id, for email-relay attachment links. */
  workgroupId?: string;
  /** Message id from `?m=`: scroll to it and highlight it when it is among these messages. */
  focusMessageId?: string | null;
};

const HIGHLIGHT_MS = 4000;

export default function WorkgroupChatTeaser({
  messages,
  joinHref,
  workgroupName,
  isMember = false,
  workgroupId = '',
  focusMessageId = null,
}: Props) {
  const { found, missing } = teaserFocusState(messages, focusMessageId);
  const [highlightDone, setHighlightDone] = useState(false);

  useEffect(() => {
    if (!found || !focusMessageId) return;
    document
      .getElementById(workgroupMessageAnchorId(focusMessageId))
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timer = window.setTimeout(() => setHighlightDone(true), HIGHLIGHT_MS);
    return () => window.clearTimeout(timer);
  }, [found, focusMessageId]);

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-sm text-slate-400">
          {isMember
            ? `Recent conversation in ${workgroupName}.`
            : `A peek at recent conversation in ${workgroupName}. Join to read the full history and post.`}
        </p>
        {isMember ? null : (
          <Link
            href={joinHref}
            className="inline-flex shrink-0 items-center rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
          >
            Join workgroup →
          </Link>
        )}
      </div>

      {missing && messages.length > 0 ? (
        <p className="mt-4 text-sm text-slate-400">
          That message is not among the recent messages shown here.
          {isMember ? '' : ' Join the workgroup to read the full history.'}
        </p>
      ) : null}

      {messages.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No messages yet. Be the first after you join.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {messages.map((msg) => {
            const highlighted = found && !highlightDone && msg.id === focusMessageId;
            return (
              <li
                key={msg.id}
                id={workgroupMessageAnchorId(msg.id)}
                className={`scroll-mt-4 rounded-lg border px-4 py-3 transition-colors duration-700 ${
                  highlighted
                    ? 'border-cyan-400/80 bg-cyan-950/40'
                    : 'border-slate-800/80 bg-slate-950/40'
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <WorkgroupMessageAuthor message={msg} />
                  <UserDateTime
                    value={msg.created_at}
                    mode="date-short"
                    className="text-xs text-slate-500"
                  />
                </div>
                <WorkgroupMessageBody
                  body={msg.body}
                  className="text-slate-300"
                  relay={
                    isEmailRelayMessage(msg)
                      ? { workgroupId: msg.workgroup_id || workgroupId, messageId: msg.id, attachments: msg.attachments }
                      : null
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
