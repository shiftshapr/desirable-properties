'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import HermesContributionCTA from '@/components/HermesContributionCTA';
import HermesContributionPanel from '@/components/HermesContributionPanel';
import HermesMarkdown from '@/components/HermesMarkdown';
import HermesThreadSidebar, { type HermesThreadSummary } from '@/components/HermesThreadSidebar';
import type { ContributionDraft, ContributionHint, ContributionScope } from '@/lib/hermesContribution';
import {
  HERMES_DOC_ACCEPT,
  HERMES_DOC_MAX_COUNT,
  HERMES_DOC_TYPES_LABEL,
  type PendingHermesDocument,
  readHermesDocument,
  toDocumentPayload,
} from '@/lib/hermesDocuments';
import { useAuth } from '@/lib/auth-context';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  attachments?: string[];
  contributionHint?: ContributionHint | null;
}

interface HermesChatProps {
  apiPath?: string;
  surface?: string;
  dpFocus?: number | null;
  compact?: boolean;
}

const INTRO =
  "I'm Hermes. I work with the community to make the Desirable Properties as coherent and impactful as possible — clarifying tensions, connecting ideas to open Gov Hub proposals, and helping shape stronger contributions. Sign in to save threads and submit Gov Hub comments or patches (with your confirmation). You can upload text, markdown, HTML, PDF, or DOCX files for review. What DP or governance question is on your mind?";

const ACTIVE_THREAD_KEY = 'hermes-active-thread';

export default function HermesChat({
  apiPath = '/api/agent/chat',
  surface = 'desirableproperties.org',
  dpFocus = null,
  compact = false,
}: HermesChatProps) {
  const { user: authUser, login, loginBusy } = useAuth();
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
  const [draftingMessageId, setDraftingMessageId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessionId] = useState(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `sess-${Date.now()}`,
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const persistActiveThread = useCallback((threadId: string | null) => {
    setActiveThreadId(threadId);
    if (typeof sessionStorage === 'undefined') return;
    if (threadId) sessionStorage.setItem(ACTIVE_THREAD_KEY, threadId);
    else sessionStorage.removeItem(ACTIVE_THREAD_KEY);
  }, []);

  const loadThreads = useCallback(async (): Promise<HermesThreadSummary[]> => {
    setThreadsLoading(true);
    try {
      const res = await fetch('/api/agent/threads');
      if (!res.ok) return [];
      const data = await res.json();
      const threadList: HermesThreadSummary[] = data.threads || [];
      setThreads(threadList);
      return threadList;
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
    persistActiveThread(threadId);
  }, [persistActiveThread]);

  useEffect(() => {
    if (!authUser) return;
    void (async () => {
      const threadList = await loadThreads();
      const saved =
        typeof sessionStorage !== 'undefined'
          ? sessionStorage.getItem(ACTIVE_THREAD_KEY)
          : null;
      if (saved && threadList.some((thread) => thread.id === saved)) {
        await loadThread(saved);
      }
    })();
  }, [authUser, loadThreads, loadThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, contributionDraft]);

  const promptSignIn = () => {
    void login().then(() => loadThreads()).catch(() => {
      // Web3Auth modal closed or failed
    });
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
    persistActiveThread(thread.id);
    setMessages([
      { id: 'intro', text: INTRO, sender: 'assistant', timestamp: new Date() },
    ]);
  };

  const onFilesSelected = async (files: FileList | null) => {
    if (!files?.length) return;
    if (!authUser) {
      promptSignIn();
      return;
    }
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

    if (!authUser) {
      promptSignIn();
      return;
    }

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
        if (response.status === 401) {
          promptSignIn();
        }
        throw new Error(data.error || 'Request failed');
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-a`,
          text: data.response,
          sender: 'assistant',
          timestamp: new Date(),
          contributionHint: data.contributionHint || null,
        },
      ]);

      if (data.threadId) {
        persistActiveThread(data.threadId);
      }

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

  const draftContribution = async (scope: ContributionScope, assistantMessageId: string) => {
    if (!authUser) {
      promptSignIn();
      return;
    }

    const assistantIdx = messages.findIndex((m) => m.id === assistantMessageId);
    if (assistantIdx < 0) return;

    const assistantMessage = messages[assistantIdx];
    const userMessage = [...messages.slice(0, assistantIdx)]
      .reverse()
      .find((m) => m.sender === 'user');
    if (!userMessage?.text) return;

    const history = messages
      .slice(0, assistantIdx)
      .filter((m) => m.id !== 'intro' && m.id !== userMessage.id)
      .slice(-10)
      .map((m) => ({ text: m.text, sender: m.sender }));

    const hint = assistantMessage.contributionHint;

    setContributionBusy(true);
    setDraftingMessageId(assistantMessageId);
    try {
      const res = await fetch('/api/agent/contributions/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope,
          message: userMessage.text,
          assistantReply: assistantMessage.text,
          history,
          dpFocus,
          kind: hint?.suggestedKind || undefined,
          draftRef: hint?.draftRefHint || undefined,
        }),
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
      setDraftingMessageId(null);
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
    ? 'relative flex h-full min-h-[420px] w-full flex-col bg-slate-950'
    : 'relative flex h-full min-h-0 w-full flex-1 flex-col bg-slate-950 md:pl-[260px] lg:pl-[280px]';

  const sidebar = (
    <HermesThreadSidebar
      threads={threads}
      activeThreadId={activeThreadId}
      loading={threadsLoading}
      signedIn={Boolean(authUser)}
      onSelect={loadThread}
      onCreate={createThread}
      onSignIn={promptSignIn}
      onClose={() => setSidebarOpen(false)}
    />
  );

  return (
    <div className={shellClass}>
      {/* Desktop sidebar — fixed to viewport left, full height below site header */}
      <div className="pointer-events-none fixed inset-y-0 left-0 z-30 hidden w-[260px] md:block lg:w-[280px]">
        <div className="pointer-events-auto flex h-full flex-col">
          {sidebar}
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 flex w-[min(100%,280px)] md:hidden">
            <div className="flex h-full w-full flex-col">{sidebar}</div>
          </div>
        </>
      ) : null}

      <div className="flex h-full min-h-0 w-full flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-800 px-4 py-2.5 md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-900"
            aria-label="Open conversations"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <p className="text-sm font-medium text-white">Hermes</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex w-full ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[80%] sm:text-base ${
                    message.sender === 'user'
                      ? 'bg-cyan-700 text-white'
                      : 'text-slate-100'
                  }`}
                >
                  {message.sender === 'assistant' ? (
                    <HermesMarkdown text={message.text} variant="dark" />
                  ) : (
                    <p className="whitespace-pre-wrap">{message.text}</p>
                  )}
                  {message.sender === 'assistant'
                    && message.contributionHint?.contributionReady ? (
                    <HermesContributionCTA
                      hint={message.contributionHint}
                      busy={contributionBusy && draftingMessageId === message.id}
                      signedIn={Boolean(authUser)}
                      onDraft={(scope) => draftContribution(scope, message.id)}
                      onSignIn={promptSignIn}
                    />
                  ) : null}
                  {message.attachments?.length ? (
                    <p className="mt-2 text-[11px] opacity-80">
                      Attached: {message.attachments.join(', ')}
                    </p>
                  ) : null}
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
                <div className="rounded-2xl px-4 py-3 text-slate-300">
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

        <div className="shrink-0 border-t border-slate-800 bg-slate-950">
          <div className="mx-auto w-full max-w-3xl px-4 py-3 sm:px-6">
            <div className="space-y-2">
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
            <div className="flex items-end gap-2 rounded-2xl border border-slate-700 bg-slate-900/80 p-2 shadow-lg shadow-black/20">
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
                className="flex h-10 shrink-0 items-center justify-center rounded-lg px-2 text-slate-400 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                title={`Upload ${HERMES_DOC_TYPES_LABEL}`}
                aria-label="Attach file"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={
                  authUser
                    ? 'Message Hermes…'
                    : 'Sign in to send a message…'
                }
                className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-1 py-2.5 text-sm leading-5 text-white placeholder:text-slate-500 focus:outline-none"
                rows={1}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={authUser ? sendMessage : promptSignIn}
                disabled={
                  (!authUser && loginBusy)
                  || (authUser && !inputText.trim() && attachments.length === 0)
                  || isLoading
                }
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-700 text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                aria-label={authUser ? 'Send message' : 'Sign in'}
              >
                {authUser ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                ) : (
                  <span className="text-[10px] font-medium">In</span>
                )}
              </button>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
