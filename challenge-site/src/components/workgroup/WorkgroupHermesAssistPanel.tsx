'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import HermesChat from '@/components/HermesChat';
import { isDpDiscoveryWorkgroup } from '@/lib/govhub';
import type { WorkgroupMessage } from '@/lib/workgroup-collab-types';

type Props = {
  workgroupSlug: string;
  workgroupName: string;
  dpId: string | null;
  recentMessages?: WorkgroupMessage[];
};

function dpFocusFromId(dpId: string | null): number | null {
  const match = String(dpId || '').match(/^DP(\d+)$/i);
  return match ? Number(match[1]) : null;
}

function formatChatContext(messages: WorkgroupMessage[], workgroupName: string): string {
  const recent = messages.slice(-8);
  if (!recent.length) {
    return `I'm in the ${workgroupName} workgroup chat. What should we focus on next?`;
  }

  const transcript = recent
    .map((msg) => {
      const author = msg.author_name?.trim() || 'Member';
      const body = msg.body.trim();
      return `${author}: ${body}`;
    })
    .join('\n');

  return [
    `I'm participating in the ${workgroupName} workgroup chat. Here are the most recent messages:`,
    '',
    transcript,
    '',
    'Based on this discussion, what should we clarify or do next?',
  ].join('\n');
}

function workgroupIntro(workgroupName: string): string {
  return `I'm Hermes, the DP Community AI. I can help you think through the ${workgroupName} workgroup discussion – clarifying Desirable Properties, spotting tensions, and suggesting next steps. Ask a question or use a starter below. Sign in to chat.`;
}

export default function WorkgroupHermesAssistPanel({
  workgroupSlug,
  workgroupName,
  dpId,
  recentMessages = [],
}: Props) {
  const [open, setOpen] = useState(false);
  const [contextPrompt, setContextPrompt] = useState<string | null>(null);
  const [chatKey, setChatKey] = useState(0);

  const isDiscovery = isDpDiscoveryWorkgroup(workgroupSlug);
  const surface = `desirableproperties.org/workgroups/${workgroupSlug}`;
  const dpFocus = dpFocusFromId(dpId);

  const starterPrompts = useMemo(() => {
    if (isDiscovery) {
      return [
        'Where might a new concept fit among the existing DPs?',
        'What gaps in the current DP set should we discuss first?',
        'How do we evaluate whether a new DP is needed?',
      ];
    }
    if (dpId) {
      return [
        `What is ${dpId} trying to guarantee in one paragraph?`,
        `What tensions show up most often in ${dpId} discussions?`,
        `What open proposals or patches exist for ${dpId}?`,
      ];
    }
    return [
      'Summarize what this workgroup should focus on.',
      'What DPs are most relevant to our discussion?',
      'What should we patch or propose next?',
    ];
  }, [dpId, isDiscovery]);

  function applyChatContext() {
    setContextPrompt(formatChatContext(recentMessages, workgroupName));
    setChatKey((key) => key + 1);
    setOpen(true);
  }

  const fullHermesHref = `/agent?starter=workgroup&prompt=${encodeURIComponent(
    formatChatContext(recentMessages, workgroupName),
  )}`;

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Ask Hermes</h2>
          <p className="mt-1 text-sm text-slate-400">
            Get DP Community AI help in the context of this workgroup – clarify concepts, compare
            properties, or plan next steps.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {recentMessages.length > 0 ? (
            <button
              type="button"
              onClick={applyChatContext}
              className="rounded-lg border border-cyan-800/60 bg-cyan-950/30 px-3 py-1.5 text-sm text-cyan-100 hover:border-cyan-600"
            >
              Use recent chat
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="rounded-lg bg-cyan-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-600"
          >
            {open ? 'Hide assistant' : 'Open assistant'}
          </button>
        </div>
      </div>

      {open ? (
        <div className="mt-5 h-[32rem] overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
          <HermesChat
            key={chatKey}
            embedded
            compact
            surface={surface}
            dpFocus={dpFocus}
            introText={workgroupIntro(workgroupName)}
            threadStorageKey={`hermes-workgroup-${workgroupSlug}`}
            initialPrompt={contextPrompt}
            starterPrompts={starterPrompts}
            starterLabel={`${workgroupName} starters`}
          />
        </div>
      ) : null}

      <p className="mt-4 text-xs text-slate-500">
        Need the full conversation history sidebar?{' '}
        <Link href={fullHermesHref} className="text-cyan-300 hover:text-cyan-200">
          Open Hermes in a new tab →
        </Link>
      </p>
    </section>
  );
}
