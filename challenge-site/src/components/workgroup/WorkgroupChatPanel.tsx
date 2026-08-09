'use client';

import { useCallback, useEffect, useState } from 'react';
import WorkgroupChatComposer from '@/components/workgroup/WorkgroupChatComposer';
import { fetchWorkgroupMessages, postWorkgroupMessage } from '@/lib/workgroup-collab-api';
import type { WorkgroupMessage } from '@/lib/workgroup-collab-types';

type Props = {
  workgroupId: string;
  workgroupSlug: string;
  signedIn: boolean;
  initialMessages?: WorkgroupMessage[];
  initialIsMember?: boolean;
  onMessagesChange?: (messages: WorkgroupMessage[]) => void;
};

function formatWhen(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function WorkgroupChatPanel({
  workgroupId,
  workgroupSlug,
  signedIn,
  initialMessages = [],
  initialIsMember = false,
  onMessagesChange,
}: Props) {
  const [messages, setMessages] = useState<WorkgroupMessage[]>(initialMessages);
  const [isMember, setIsMember] = useState(initialIsMember);
  const [canPost, setCanPost] = useState(initialIsMember);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchWorkgroupMessages(workgroupId, { full: true });
      setMessages(data.messages || []);
      setIsMember(Boolean(data.is_member));
      setCanPost(Boolean(data.can_post));
      setError(null);
      onMessagesChange?.(data.messages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [workgroupId, onMessagesChange]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function handleSend(body: string) {
    setPosting(true);
    try {
      const result = await postWorkgroupMessage(workgroupId, body);
      if (result.message) {
        setMessages((prev) => {
          const next = [...prev, result.message!];
          onMessagesChange?.(next);
          return next;
        });
      } else {
        await refresh();
      }
    } finally {
      setPosting(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Workgroup chat</h2>
          <p className="mt-1 text-sm text-slate-400">
            {isMember ? 'Member view – refreshes every 30s.' : 'Loading membership…'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="text-xs text-slate-400 hover:text-cyan-300"
        >
          Refresh
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

      <div className="mt-5 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
        {loading && messages.length === 0 ? (
          <p className="text-sm text-slate-500">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-slate-500">No messages yet. Start the conversation.</p>
        ) : (
          messages.map((msg) => (
            <article
              key={msg.id}
              className="rounded-lg border border-slate-800/80 bg-slate-950/40 px-4 py-3"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-cyan-200">{msg.author_name || 'Member'}</span>
                <time className="text-xs text-slate-500">{formatWhen(msg.created_at)}</time>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                {msg.body}
              </p>
            </article>
          ))
        )}
      </div>

      <div className="mt-5 border-t border-slate-800 pt-4">
        <WorkgroupChatComposer
          workgroupSlug={workgroupSlug}
          canPost={canPost}
          signedIn={signedIn}
          busy={posting}
          onSend={handleSend}
        />
      </div>
    </section>
  );
}
