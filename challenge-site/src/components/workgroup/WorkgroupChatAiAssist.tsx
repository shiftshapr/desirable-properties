'use client';

import { useMemo, useState } from 'react';
import { isDpDiscoveryWorkgroup } from '@/lib/govhub';
import type { WorkgroupMessage } from '@/lib/workgroup-collab-types';

type Props = {
  workgroupSlug: string;
  workgroupName: string;
  dpId: string | null;
  recentMessages: WorkgroupMessage[];
  onInsertDraft: (text: string) => void;
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

  return [
    `Workgroup: ${workgroupName}`,
    'Recent chat:',
    transcript,
  ].join('\n');
}

export default function WorkgroupChatAiAssist({
  workgroupSlug,
  workgroupName,
  dpId,
  recentMessages,
  onInsertDraft,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDiscovery = isDpDiscoveryWorkgroup(workgroupSlug);
  const surface = `desirableproperties.org/workgroups/${workgroupSlug}`;
  const dpFocus = dpFocusFromId(dpId);

  const starterPrompts = useMemo(() => {
    if (isDiscovery) {
      return [
        'Where might a new concept fit among the existing DPs?',
        'What gaps should we discuss first?',
        'Help me draft a reply to the latest message.',
      ];
    }
    if (dpId) {
      return [
        `Summarize what ${dpId} means in one paragraph.`,
        `Help me draft a reply about ${dpId}.`,
        `What tensions show up in ${dpId} discussions?`,
      ];
    }
    return [
      'Summarize what this workgroup should focus on.',
      'Help me draft a reply to the latest message.',
      'What should we propose or patch next?',
    ];
  }, [dpId, isDiscovery]);

  async function askAi(promptText?: string) {
    const text = (promptText ?? question).trim();
    if (!text || loading || disabled) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    const contextBlock = formatChatContext(recentMessages, workgroupName);
    const fullMessage = [
      contextBlock,
      '',
      '---',
      '',
      text,
    ].join('\n');

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: fullMessage,
          history: [],
          surface,
          dpFocus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI request failed');
      setResponse(data.response || '');
      if (promptText) setQuestion(promptText);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI request failed');
    } finally {
      setLoading(false);
    }
  }

  function useAsReply() {
    if (!response?.trim()) return;
    onInsertDraft(response.trim());
    setOpen(false);
    setResponse(null);
    setQuestion('');
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          disabled={disabled}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            open
              ? 'border-cyan-600 bg-cyan-950/50 text-cyan-100'
              : 'border-slate-700 text-slate-300 hover:border-cyan-700 hover:text-cyan-200'
          }`}
        >
          {open ? 'Close AI assist' : 'Ask AI'}
        </button>
        {open ? (
          <span className="text-xs text-slate-500">
            Draft help in context of this chat — insert into your message below.
          </span>
        ) : null}
      </div>

      {open ? (
        <div className="rounded-lg border border-cyan-900/50 bg-cyan-950/20 p-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            {starterPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={loading || disabled}
                onClick={() => void askAi(prompt)}
                className="rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1 text-xs text-slate-300 hover:border-cyan-700 hover:text-cyan-200 disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void askAi();
                }
              }}
              placeholder="Ask AI about this discussion…"
              disabled={loading || disabled}
              className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-600 focus:outline-none disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => void askAi()}
              disabled={loading || disabled || !question.trim()}
              className="shrink-0 rounded-lg bg-cyan-800 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Thinking…' : 'Ask'}
            </button>
          </div>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          {response ? (
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-cyan-400/80">
                AI suggestion
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                {response}
              </p>
              <button
                type="button"
                onClick={useAsReply}
                className="mt-3 rounded-lg border border-cyan-700 bg-cyan-950/40 px-3 py-1.5 text-sm text-cyan-100 hover:bg-cyan-900/40"
              >
                Use as reply
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
