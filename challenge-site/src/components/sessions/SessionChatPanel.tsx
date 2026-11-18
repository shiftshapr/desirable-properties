'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import CommunityChatComposer from '@/components/community/CommunityChatComposer';
import CommunityChatMessageItem from '@/components/community/CommunityChatMessageItem';
import { communityMessageAsWorkgroup } from '@/lib/community-collab-types';
import { SESSION_CHAT_MAX_BODY, SESSION_CHAT_POLL_MS, type SessionChatMessage } from '@/lib/sessions/session-chat-core';
import type { WorkgroupMessage } from '@/lib/workgroup-collab-types';

type Props = {
  /** Session occurrence slug, e.g. "meta-governance-2026-11-16". */
  slug: string;
  currentUserId: string;
  /** Where the sign-in link returns to if the session expires while the page is open. */
  signInHref: string;
};

class ChatError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', cache: 'no-store', ...init });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new ChatError(typeof data.error === 'string' ? data.error : `Request failed (${res.status})`, res.status);
  return data;
}

const NOOP = () => {};

/**
 * The session chat itself: messages, polling and the composer. Self-contained (slug + viewer only), so the listening
 * workspace can later mount it in its participation column. Rendered only for a signed-in request (SessionChat.tsx).
 * No Hermes/AI assist.
 */
export default function SessionChatPanel({ slug, currentUserId, signInHref }: Props) {
  const base = `/api/sessions/${encodeURIComponent(slug)}/chat`;
  const [messages, setMessages] = useState<WorkgroupMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const data = await call<{ messages: SessionChatMessage[] }>(base);
      setMessages((data.messages || []).map(communityMessageAsWorkgroup));
      setError(null);
    } catch (err) {
      if (err instanceof ChatError && err.status === 401) setSignedOut(true);
      else setError(err instanceof Error ? err.message : 'Could not load the chat');
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    if (signedOut) return;
    // First load on the next tick (not inside the effect body), then poll while the tab is visible.
    const first = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, SESSION_CHAT_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh, signedOut]);

  // Follow new messages only when the reader is already at the bottom of the list.
  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function onScroll() {
    const el = listRef.current;
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  }

  async function handleSend(body: string) {
    setPosting(true);
    try {
      const data = await call<{ message?: SessionChatMessage }>(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      const added = data.message ? communityMessageAsWorkgroup(data.message) : null;
      if (added) setMessages((prev) => (prev.some((m) => m.id === added.id) ? prev : [...prev, added]));
      stickToBottom.current = true;
      setError(null);
    } catch (err) {
      if (err instanceof ChatError && err.status === 401) setSignedOut(true);
      setError(err instanceof Error ? err.message : 'Could not post');
      throw err;
    } finally {
      setPosting(false);
    }
  }

  async function handleSaveEdit(messageId: string, body: string) {
    setEditBusy(true);
    try {
      const data = await call<{ message?: SessionChatMessage }>(`${base}/${encodeURIComponent(messageId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      if (data.message) {
        const updated = communityMessageAsWorkgroup(data.message);
        setMessages((prev) => prev.map((m) => (m.id === messageId ? updated : m)));
      }
      setEditingId(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the edit');
    } finally {
      setEditBusy(false);
    }
  }

  if (signedOut) {
    return (
      <p className="text-base text-slate-300">
        Your sign-in has ended.{' '}
        <a href={signInHref} className="text-cyan-300 hover:text-cyan-200">
          Sign in to join the session chat
        </a>
        .
      </p>
    );
  }

  return (
    <div>
      <p className="text-sm text-slate-400">
        For everyone signed in. Messages show your display name and stay on this page after the meeting. New messages
        appear every few seconds.
      </p>
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      <div
        ref={listRef}
        onScroll={onScroll}
        className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto pr-1"
        aria-live="polite"
        aria-busy={loading}
      >
        {loading && messages.length === 0 ? (
          <p className="text-sm text-slate-500">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-slate-500">No messages yet. Start the conversation.</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} id={`session-chat-${msg.id}`} className="scroll-mt-24">
              <CommunityChatMessageItem
                message={msg}
                hands={[]}
                canPrompt={false}
                canEdit={msg.author_user_id === currentUserId && msg.source !== 'deepi_shared'}
                editing={editingId === msg.id}
                editBusy={editBusy}
                onStartEdit={() => setEditingId(msg.id)}
                onCancelEdit={() => setEditingId(null)}
                onSaveEdit={(body) => handleSaveEdit(msg.id, body)}
                onOpenHand={NOOP}
              />
            </div>
          ))
        )}
      </div>
      <div className="mt-4 border-t border-slate-800 pt-4">
        <CommunityChatComposer
          communityThreadId={`session:${slug}`}
          communityTitle="Session chat"
          recentMessages={messages}
          canPost
          signedIn
          busy={posting}
          onSend={handleSend}
          aiAssist={false}
          inputId={`session-chat-body-${slug}`}
          inputLabel="Message the session chat"
          placeholder="Message the session chat…"
        />
        <p className="mt-1 text-xs text-slate-500">Up to {SESSION_CHAT_MAX_BODY.toLocaleString('en-US')} characters. Text only.</p>
      </div>
    </div>
  );
}
