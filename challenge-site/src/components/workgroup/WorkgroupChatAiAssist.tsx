'use client';

import { useMemo } from 'react';
import ComposeFieldAiAssist, {
  type ComposeAiPromptOption,
} from '@/components/compose/ComposeFieldAiAssist';
import { isDpDiscoveryWorkgroup } from '@/lib/govhub';
import type { WorkgroupMessage } from '@/lib/workgroup-collab-types';
import type { RefObject } from 'react';

type Props = {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onValueChange: (next: string) => void;
  workgroupSlug: string;
  workgroupName: string;
  dpId: string | null;
  recentMessages: WorkgroupMessage[];
  disabled?: boolean;
};

function dpFocusFromId(dpId: string | null): number | null {
  const match = String(dpId || '').match(/^DP(\d+)$/i);
  return match ? Number(match[1]) : null;
}

function formatChatContext(messages: WorkgroupMessage[], workgroupName: string): string {
  const recent = messages.slice(-8);
  if (!recent.length) {
    return `I'm in the ${workgroupName} workgroup chat. No messages yet.`;
  }

  const transcript = recent
    .map((msg) => {
      const author = msg.author_name?.trim() || 'Member';
      return `${author}: ${msg.body.trim()}`;
    })
    .join('\n');

  return [`Workgroup: ${workgroupName}`, 'Recent chat:', transcript].join('\n');
}

export default function WorkgroupChatAiAssist({
  textareaRef,
  value,
  onValueChange,
  workgroupSlug,
  workgroupName,
  dpId,
  recentMessages,
  disabled,
}: Props) {
  const isDiscovery = isDpDiscoveryWorkgroup(workgroupSlug);
  const surface = `desirableproperties.org/workgroups/${workgroupSlug}`;
  const dpFocus = dpFocusFromId(dpId);

  const promptOptions = useMemo<ComposeAiPromptOption[]>(() => {
    if (isDiscovery) {
      return [
        { id: 'fit', label: 'Where might a new concept fit among the existing DPs?' },
        { id: 'gaps', label: 'What gaps should we discuss first?' },
        { id: 'reply', label: 'Help me draft a reply to the latest message.' },
      ];
    }
    if (dpId) {
      return [
        { id: 'summarize', label: `Summarize what ${dpId} means in one paragraph.` },
        { id: 'reply', label: `Help me draft a reply about ${dpId}.` },
        { id: 'tensions', label: `What tensions show up in ${dpId} discussions?` },
      ];
    }
    return [
      { id: 'focus', label: 'Summarize what this workgroup should focus on.' },
      { id: 'reply', label: 'Help me draft a reply to the latest message.' },
      { id: 'next', label: 'What should we propose or patch next?' },
    ];
  }, [dpId, isDiscovery]);

  async function generate(
    option: ComposeAiPromptOption,
    _context: { draft: string; selection: string },
    signal: AbortSignal,
  ): Promise<string> {
    const contextBlock = formatChatContext(recentMessages, workgroupName);
    const userDraft = _context.selection.trim() || _context.draft.trim();
    const fullMessage = [
      contextBlock,
      '',
      '---',
      '',
      userDraft ? `Current draft:\n${userDraft}\n\n---\n\n` : '',
      option.label,
    ]
      .filter(Boolean)
      .join('\n');

    const res = await fetch('/api/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: fullMessage,
        history: [],
        surface,
        dpFocus,
      }),
      signal,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'AI request failed');
    return data.response || '';
  }

  return (
    <ComposeFieldAiAssist
      textareaRef={textareaRef}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      promptOptions={promptOptions}
      onGenerate={generate}
      fieldLabel="workgroup message"
    />
  );
}
