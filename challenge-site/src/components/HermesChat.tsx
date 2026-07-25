'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import HermesContributionPanel, { type ContributionDraft } from '@/components/HermesContributionPanel';
import HermesMarkdown from '@/components/HermesMarkdown';
import HermesThreadSidebar, { type HermesThreadSummary } from '@/components/HermesThreadSidebar';
import Web3AuthLogin, { type AuthUser } from '@/components/Web3AuthLogin';
import {
  HERMES_DOC_ACCEPT,
  HERMES_DOC_MAX_COUNT,
  HERMES_DOC_TYPES_LABEL,
  type PendingHermesDocument,
  readHermesDocument,
  toDocumentPayload,
} from '@/lib/hermesDocuments';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  attachments?: string[];
}

interface HermesChatProps {
  apiPath?: string;
  surface?: string;
  dpFocus?: number | null;
  compact?: boolean;
}

const INTRO =
  "I'm Hermes. I work with the community to make the Desirable Properties as coherent and impactful as possible — clarifying tensions, connecting ideas to open Gov Hub proposals, and helping shape stronger contributions. Sign in to save threads and submit Gov Hub comments or patches (with your confirmation). You can upload text, markdown, HTML, PDF, or DOCX files for review. What DP or governance question is on your mind?";

export default function HermesChat({
  apiPath = '/api/agent/chat',
  surface = 'desirableproperties.org',
  dpFocus = null,
  compact = false,
}: HermesChatProps) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [threads, setThreads] = useState<HermesThreadSummary[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'intro',
      text: INTRO,
      sender: 'assistant',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<PendingHermesDocument[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [contributionDraft, setContributionDraft] = useState<ContributionDraft | null>(null);
  const [contributionBusy, setContributionBusy] = useState(false);
  const [sessionId] = useState(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `sess-${Date.now()}`,
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadThreads = useCallback(async () => {
    setThreadsLoading(true);
    try {
      const res = await fetch('/api/agent/threads');
      if (!res.ok) return;
      const data = await res.json();
      setThreads(data.threads || []);
    } finally {
      setThreadsLoading(false);
    }
  }, []);

  const loadThread = useCallback(async (threadId: string) => {
    const res = await fetch(`/api/agent/threads/${encodeURIComponent(threadId)}`);
    if (!res.ok) return;
    const data = await res.json();
    const turns = data.thread?.turns || [];
    const restored: Message[] = [
      {
        id: 'intro',
        text: INTRO,
        sender: 'assistant',
        timestamp: new Date(),
      },
    ];
    for (const turn of turns) {
      if (turn.user) {
        restored.push({
          id: `${turn.id}-u`,
          text: turn.user,
          sender: 'user',
          timestamp: new Date(),
        });
      }
      if (turn.assistant) {
        restored.push({
          id: `${turn.id}-a`,
          text: turn.assistant,
          sender: 'assistant',
          timestamp: new Date(),
        });
      }
    }
    setMessages(restored);
    setActiveThreadId(threadId);
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated && data.user) setAuthUser(data.user);
      })
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (authUser) loadThreads();
  }, [authUser, loadThreads]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, contributionDraft]);

  const onAuthenticated = (user: AuthUser) => {
    setAuthUser(user);
    loadThreads();
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setAuthUser(null);
    setThreads([]);
    setActiveThreadId(null);
    setContributionDraft(null);
  };

  const createThread = async () => {
    const res = await fetch('/api/agent/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ surface: `${surface}/agent`, title: 'New conversation' }),
    });
    const data = await res.json();
    if (!res.ok) return;
    const thread = data.thread;
    setThreads((prev) => [thread, ...prev]);
    setActiveThreadId(thread.id);
    setMessages([
      { id: 'intro', text: INTRO, sender: 'assistant', timestamp: new Date() },
    ]);
  };

  const onFilesSelected = async (files: FileList | null) => {
    if (!files?.length) return;
    setAttachError(null);

    const next = [...attachments];
    for (const file of Array.from(files)) {
      if (next.length >= HERMES_DOC_MAX_COUNT) {
        setAttachError(`Maximum ${HERMES_DOC_MAX_COUNT} documents per message`);
        break;
      }
      try {
        next.push(await readHermesDocument(file));
      } catch (err) {
        setAttachError(err instanceof Error ? err.message : 'Could not read file');
      }
    }
    setAttachments(next);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((doc) => doc.id !== id));
  };

  const sendMessage = async () => {
    const text = inputText.trim();
    if ((!text && attachments.length === 0) || isLoading) return;

    const attachmentNames = attachments.map((doc) => doc.name);
    const displayText = text
      || (attachmentNames.length
        ? `Uploaded ${attachmentNames.join(', ')} for review`
        : '');

    const userMessage: Message = {
      id: `${Date.now()}-u`,
      text: displayText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    const docsToSend = attachments;
    setAttachments([]);
    setIsLoading(true);

    try {
      const response = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          documents: toDocumentPayload(docsToSend),
          history: messages.slice(-10).map((m) => ({ text: m.text, sender: m.sender })),
          surface,
          sessionId,
          threadId: activeThreadId,
          dpFocus,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-a`,
          text: data.response,
          sender: 'assistant',
          timestamp: new Date(),
        },
      ]);

      if (authUser) loadThreads();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-e`,
          text: err instanceof Error
            ? err.message
            : "Hermes couldn't connect right now. Please try again in a moment.",
          sender: 'assistant',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const draftContribution = async () => {
    if (!authUser) return;
    const lastUser = [...messages].reverse().find((m) => m.sender === 'user');
    const prompt = lastUser?.text || inputText.trim();
    if (!prompt) return;

    setContributionBusy(true);
    try {
      const res = await fetch('/api/agent/contributions/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, dpFocus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not draft contribution');
      setContributionDraft(data.draft);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-cd`,
          text: err instanceof Error ? err.message : 'Contribution draft failed',
          sender: 'assistant',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setContributionBusy(false);
    }
  };

  const submitContribution = async () => {
    if (!contributionDraft || !authUser) return;
    setContributionBusy(true);
    try {
      const res = await fetch('/api/agent/contributions/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: contributionDraft.kind,
          draftRef: contributionDraft.draftRef,
          payload: contributionDraft.payload,
          threadId: activeThreadId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submit failed');
      setContributionDraft(null);
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-sub`,
          text: `Submitted to Gov Hub as a ${contributionDraft.kind}. It will appear on ${contributionDraft.draftRef} after review.`,
          sender: 'assistant',
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-se`,
          text: err instanceof Error ? err.message : 'Gov Hub submit failed',
          sender: 'assistant',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setContributionBusy(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const shellClass = compact
    ? 'flex h-full min-h-[420px] flex-col rounded-xl border border-slate-800 bg-slate-950'
    : 'flex h-full min-h-0 flex-col bg-slate-950';

  return (
    <div className={`${shellClass} md:flex-row`}>
      {authUser ? (
        <HermesThreadSidebar
          threads={threads}
          activeThreadId={activeThreadId}
          loading={threadsLoading}
          onSelect={loadThread}
          onCreate={createThread}
        />
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-cyan-400">Hermes</p>
            <h1 className="text-lg font-semibold text-white sm:text-xl">
              Desirable Properties community agent
            </h1>
          </div>
          <div className="text-right">
            {authChecked && authUser ? (
              <div className="space-y-1">
                <p className="text-xs text-slate-300">
                  {authUser.displayName || authUser.username}
                </p>
                <button
                  type="button"
                  onClick={logout}
                  className="text-[11px] text-slate-400 hover:text-white"
                >
                  Sign out
                </button>
              </div>
            ) : authChecked ? (
              <Web3AuthLogin onAuthenticated={onAuthenticated} compact />
            ) : null}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[80%] sm:text-base ${
                    message.sender === 'user'
                      ? 'bg-cyan-700 text-white'
                      : 'border border-slate-800 bg-slate-900 text-slate-100'
                  }`}
                >
                  {message.sender === 'assistant' ? (
                    <HermesMarkdown text={message.text} variant="dark" />
                  ) : (
                    <p className="whitespace-pre-wrap">{message.text}</p>
                  )}
                  {message.attachments?.length ? (
                    <p className="mt-2 text-[11px] opacity-80">
                      Attached: {message.attachments.join(', ')}
                    </p>
                  ) : null}
                  <p className="mt-2 text-[11px] opacity-60">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}

            {contributionDraft ? (
              <HermesContributionPanel
                draft={contributionDraft}
                busy={contributionBusy}
                onConfirm={submitContribution}
                onCancel={() => setContributionDraft(null)}
              />
            ) : null}

            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-300">
                  <span className="inline-flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400 [animation-delay:0.1s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400 [animation-delay:0.2s]" />
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t border-slate-800 px-4 py-4 sm:px-6">
          <div className="mx-auto max-w-3xl space-y-3">
            {authUser ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={draftContribution}
                  disabled={contributionBusy || isLoading}
                  className="rounded-lg border border-amber-700/60 px-3 py-1.5 text-xs text-amber-200 hover:border-amber-500 disabled:opacity-50"
                >
                  Draft Gov Hub contribution
                </button>
              </div>
            ) : null}
            {attachments.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {attachments.map((doc) => (
                  <li
                    key={doc.id}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200"
                  >
                    <span className="max-w-[220px] truncate">{doc.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(doc.id)}
                      className="text-slate-400 hover:text-white"
                      aria-label={`Remove ${doc.name}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {attachError ? <p className="text-xs text-rose-300">{attachError}</p> : null}
            <div className="flex gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept={HERMES_DOC_ACCEPT}
                multiple
                className="hidden"
                onChange={(e) => onFilesSelected(e.target.files)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || attachments.length >= HERMES_DOC_MAX_COUNT}
                className="rounded-xl border border-slate-700 px-4 py-3 text-sm text-slate-200 hover:border-cyan-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                title={`Upload ${HERMES_DOC_TYPES_LABEL}`}
              >
                Attach
              </button>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask about a DP, upload a draft for review, or describe a governance tension…"
                className="min-h-[52px] flex-1 resize-none rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
                rows={2}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={(!inputText.trim() && attachments.length === 0) || isLoading}
                className="rounded-xl bg-cyan-700 px-5 py-3 text-sm font-medium text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-700"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
