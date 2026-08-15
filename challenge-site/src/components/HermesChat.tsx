'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { DpDialog, DpDialogHost } from '@/components/DpDialog';
import HermesComposerAiAssist from '@/components/HermesComposerAiAssist';
import HermesContributionCTA from '@/components/HermesContributionCTA';
import HermesContributionPanel from '@/components/HermesContributionPanel';
import HermesMarkdown from '@/components/HermesMarkdown';
import HermesTeachModal from '@/components/HermesTeachModal';
import HermesThreadSidebar, { type HermesThreadSummary } from '@/components/HermesThreadSidebar';
import { bookDiscussDraftHref, bookDiscussHref, bookDiscussPostHref } from '@/lib/govhub';
import { defaultDestination, discussLinkLabel, inferContributionHint, saveStagedProposal } from '@/lib/hermesContribution';
import type { ContributionDraft, ContributionHint, ContributionProposal, ContributionScope, ContributionSubmitMode, DiscussDeepLink } from '@/lib/hermesContribution';
import {
  HERMES_DOC_ACCEPT,
  HERMES_DOC_MAX_COUNT,
  HERMES_DOC_TYPES_LABEL,
  type PendingHermesDocument,
  readHermesDocument,
  toDocumentPayload,
} from '@/lib/hermesDocuments';
import { useAuth } from '@/lib/auth-context';
import { refreshSessionIdToken } from '@/lib/web3auth-login';
import type { AuthUser } from '@/lib/auth-types';
import { dpDetailHref } from '@/lib/dp-links';
import { useCurrentFromPath } from '@/lib/useCurrentFromPath';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  attachments?: string[];
  contributionHint?: ContributionHint | null;
  citedDps?: number[];
  turnId?: string;
  truncated?: boolean;
}

type SystemNotice = {
  text: string;
  variant: 'success' | 'error' | 'info';
  links?: DiscussDeepLink[];
};

interface HermesChatProps {
  apiPath?: string;
  surface?: string;
  dpFocus?: number | null;
  compact?: boolean;
  initialSignedIn?: boolean;
  initialUser?: AuthUser | null;
  /** Prefill the composer (e.g. from /agent?prompt=…). */
  initialPrompt?: string | null;
  /** Optional pathway-specific starters shown above the defaults. */
  starterPrompts?: string[] | null;
  /** Label shown above pathway starters. */
  starterLabel?: string | null;
}

const INTRO =
  "I'm Hermes, the DP Community AI. I help this community improve the Desirable Properties of a layered web – clarifying what they mean, surfacing tensions, and turning good arguments into patches. Sign in to chat. Your conversations are saved in the sidebar for future reference and continuing dialog.";

const DEFAULT_STARTER_PROMPTS = [
  'What does DP7 mean by bridge?',
  'Where do DP22 and DP23 overlap?',
  'What open proposals exist on DP4?',
];

function userFacingError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (isAbortError(err)) {
    return 'Stopped.';
  }
  if (/did not match the expected pattern/i.test(msg)) {
    return "Hermes couldn't reach the server. Hard-refresh the page and try again — if it keeps failing, the reply may be timing out.";
  }
  if (/^LLM\b/.test(msg) || /fetch failed|network|timeout|aborted|load failed/i.test(msg)) {
    return "Hermes couldn't respond right now. Your message wasn't lost – try sending again.";
  }
  if (/jwt expired|session expired|sign in again/i.test(msg)) {
    return msg;
  }
  if (/internal server error/i.test(msg)) {
    return 'Publish failed on Canopi Discuss. Your sign-in may have expired — sign in again and retry. If it persists, try Save to my drafts first.';
  }
  return msg;
}

async function ensureFreshCanopiSession(): Promise<void> {
  const refreshed = await refreshSessionIdToken();
  if (refreshed) return;
  throw new Error('Your sign-in session expired. Sign in again, then retry publishing.');
}

function isAbortError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  if (err instanceof Error && err.name === 'AbortError') return true;
  return false;
}

function resolveDiscussLink(
  item: ContributionProposal,
  draftRef: string,
  data: {
    link?: { id?: string; href?: string; pageId?: string };
    result?: { id?: string; pageId?: string; messageId?: string; draftId?: string };
  },
  kind: 'post' | 'draft',
): DiscussDeepLink | null {
  const backendLink = data.link;
  if (backendLink?.href) {
    return {
      id: String(backendLink.id || data.result?.id || `${kind}-${item.id}`),
      href: backendLink.href,
      pageId: backendLink.pageId || data.result?.pageId,
      label: discussLinkLabel(item, kind),
    };
  }

  const result = data.result && typeof data.result === 'object' ? data.result : {};
  const id = String(
    result.id || result.messageId || result.draftId || '',
  ).trim();
  const pageId = String(result.pageId || '').trim() || undefined;
  if (id) {
    const href =
      kind === 'draft'
        ? bookDiscussDraftHref({ draftId: id, draftRef, pageId })
        : bookDiscussPostHref({ messageId: id, draftRef, pageId });
    if (href) {
      return {
        id,
        href,
        pageId,
        label: discussLinkLabel(item, kind),
      };
    }
  }

  const fallbackHref = bookDiscussHref({ dpId: draftRef.replace(/^ML-/i, 'DP') });
  if (fallbackHref) {
    return {
      id: `discuss-${item.id}`,
      href: fallbackHref,
      label: kind === 'draft'
        ? `Open Discuss drafts on ${draftRef}`
        : `Open Discuss on ${draftRef}`,
    };
  }
  return null;
}

function proposalsFromContributionDraft(draft: ContributionDraft): ContributionProposal[] {
  if (draft.proposals?.length) return draft.proposals;
  return [{ id: 'p0', kind: draft.kind, payload: draft.payload }];
}

function dpChipLabel(dpNum: number): string {
  if (dpNum >= 1 && dpNum <= 22) return 'inscribed';
  return 'draft';
}

const ACTIVE_THREAD_KEY = 'hermes-active-thread';
/** Matches Tailwind `max-h-40` on the composer textarea. */
const COMPOSER_MAX_HEIGHT_PX = 160;

const CONTINUE_PROMPT =
  'Continue your previous reply from exactly where you stopped. Do not repeat content you already wrote. Complete any unfinished numbered items, tables, or sentences and end with proper punctuation.';

function looksTruncatedReply(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (/[.!?)"'\]]$/.test(trimmed)) return false;
  return /[a-zA-Z0-9'"]$/.test(trimmed);
}

function formatUserMessageTimestamp(date: Date): string {
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function turnIdFromMessageId(messageId: string): string | null {
  if (!messageId.endsWith('-u')) return null;
  const turnId = messageId.slice(0, -2);
  return turnId && turnId !== 'intro' ? turnId : null;
}

function historyFromMessages(msgs: Message[]) {
  return msgs
    .filter((m) => m.id !== 'intro')
    .slice(-10)
    .map((m) => ({ text: m.text, sender: m.sender }));
}

async function hydrateLastContributionHint(
  messages: Message[],
  dpFocus: number | null,
): Promise<Message[]> {
  let lastAssistantIdx = -1;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].sender === 'assistant' && messages[i].id !== 'intro') {
      lastAssistantIdx = i;
      break;
    }
  }
  if (lastAssistantIdx < 0) return messages;

  const assistantMessage = messages[lastAssistantIdx];
  if (assistantMessage.contributionHint?.contributionReady) return messages;

  const userMessage = [...messages.slice(0, lastAssistantIdx)]
    .reverse()
    .find((m) => m.sender === 'user');
  if (!userMessage?.text || !assistantMessage.text) return messages;

  const history = messages
    .slice(0, lastAssistantIdx)
    .filter((m) => m.id !== 'intro' && m.id !== userMessage.id)
    .slice(-10)
    .map((m) => ({ text: m.text, sender: m.sender }));

  try {
    const res = await fetch('/api/agent/contributions/readiness', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage.text,
        assistantReply: assistantMessage.text,
        history,
        dpFocus,
      }),
    });
    const data = await res.json();
    if (res.ok && data.contributionHint?.contributionReady) {
      const next = [...messages];
      next[lastAssistantIdx] = {
        ...assistantMessage,
        contributionHint: data.contributionHint,
      };
      return next;
    }
  } catch {
    /* try local heuristic */
  }

  const localHint = inferContributionHint(
    userMessage.text,
    assistantMessage.text,
    history,
    dpFocus,
  );
  if (localHint?.contributionReady) {
    const next = [...messages];
    next[lastAssistantIdx] = {
      ...assistantMessage,
      contributionHint: localHint,
    };
    return next;
  }

  return messages;
}

export default function HermesChat({
  apiPath = '/api/agent/chat',
  surface = 'desirableproperties.org',
  dpFocus = null,
  compact = false,
  initialSignedIn = false,
  initialUser = null,
  initialPrompt = null,
  starterPrompts = null,
  starterLabel = null,
}: HermesChatProps) {
  const { user: authUser, checked, login, loginBusy } = useAuth();
  const fromPath = useCurrentFromPath();
  const signedIn = checked ? Boolean(authUser) : (initialSignedIn || Boolean(initialUser));
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
  const [inputText, setInputText] = useState(() =>
    typeof initialPrompt === 'string' ? initialPrompt : '',
  );
  const visibleStarters =
    starterPrompts && starterPrompts.length > 0
      ? starterPrompts
      : DEFAULT_STARTER_PROMPTS;
  const [attachments, setAttachments] = useState<PendingHermesDocument[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [contributionDraft, setContributionDraft] = useState<ContributionDraft | null>(null);
  const [contributionBusy, setContributionBusy] = useState(false);
  const [draftingMessageId, setDraftingMessageId] = useState<string | null>(null);
  const [correctionBusyId, setCorrectionBusyId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [assistantActionId, setAssistantActionId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [teachOpen, setTeachOpen] = useState(false);
  const [teachTargetId, setTeachTargetId] = useState<string | null>(null);
  const [teachText, setTeachText] = useState('');
  const [teachUserQuestion, setTeachUserQuestion] = useState<string | undefined>();
  const [teachWrongReply, setTeachWrongReply] = useState<string | undefined>();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [threadLoadError, setThreadLoadError] = useState<string | null>(null);
  const [threadLoadingId, setThreadLoadingId] = useState<string | null>(null);
  const [systemNotice, setSystemNotice] = useState<SystemNotice | null>(null);
  const [sessionId] = useState(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `sess-${Date.now()}`,
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const activeThreadIdRef = useRef<string | null>(null);
  const chatAbortRef = useRef<AbortController | null>(null);

  const beginChatAbort = useCallback(() => {
    chatAbortRef.current?.abort();
    const controller = new AbortController();
    chatAbortRef.current = controller;
    return controller;
  }, []);

  const clearChatAbort = useCallback((controller: AbortController) => {
    if (chatAbortRef.current === controller) {
      chatAbortRef.current = null;
    }
  }, []);

  const stopChat = useCallback(() => {
    chatAbortRef.current?.abort();
    chatAbortRef.current = null;
  }, []);

  const syncComposerHeight = useCallback(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(el.scrollHeight, COMPOSER_MAX_HEIGHT_PX);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > COMPOSER_MAX_HEIGHT_PX ? 'auto' : 'hidden';
  }, []);

  const persistActiveThread = useCallback((threadId: string | null) => {
    activeThreadIdRef.current = threadId;
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
    setThreadLoadError(null);
    setThreadLoadingId(threadId);
    try {
      const res = await fetch(`/api/agent/threads/${encodeURIComponent(threadId)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setThreadLoadError(data.error || 'Could not load this conversation');
        return;
      }
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
            timestamp: turn.createdAt ? new Date(turn.createdAt) : new Date(),
            turnId: turn.id,
          });
        }
        if (turn.assistant) {
          restored.push({
            id: `${turn.id}-a`,
            text: turn.assistant,
            sender: 'assistant',
            timestamp: turn.createdAt ? new Date(turn.createdAt) : new Date(),
            turnId: turn.id,
            contributionHint: turn.contributionHint || null,
            citedDps: Array.isArray(turn.citedDps) ? turn.citedDps : [],
          });
        }
      }
      const hydrated = await hydrateLastContributionHint(restored, dpFocus);
      setMessages(hydrated);
      setContributionDraft(null);
      setAttachments([]);
      setAttachError(null);
      persistActiveThread(threadId);
    } finally {
      setThreadLoadingId(null);
    }
  }, [persistActiveThread, dpFocus]);

  useEffect(() => {
    if (!signedIn) return;
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
  }, [signedIn, loadThreads, loadThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, contributionDraft]);

  useEffect(() => {
    syncComposerHeight();
  }, [inputText, syncComposerHeight]);

  useEffect(() => {
    const onResize = () => syncComposerHeight();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [syncComposerHeight]);

  const promptSignIn = () => {
    void login().then(() => loadThreads()).catch(() => {
      // Web3Auth modal closed or failed
    });
  };

  const startNewConversation = () => {
    persistActiveThread(null);
    setContributionDraft(null);
    setAttachments([]);
    setAttachError(null);
    setSystemNotice(null);
    setMessages([
      { id: 'intro', text: INTRO, sender: 'assistant', timestamp: new Date() },
    ]);
  };

  const renameThread = useCallback(async (threadId: string, title: string) => {
    const res = await fetch(`/api/agent/threads/${encodeURIComponent(threadId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setSystemNotice({
        variant: 'error',
        text: data.error || 'Could not rename conversation',
      });
      return;
    }
    setThreads((prev) =>
      prev.map((thread) => (thread.id === threadId ? { ...thread, title } : thread)),
    );
  }, []);

  const pinThread = useCallback(async (threadId: string, pinned: boolean) => {
    const res = await fetch(`/api/agent/threads/${encodeURIComponent(threadId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setSystemNotice({
        variant: 'error',
        text: data.error || 'Could not update pin',
      });
      return;
    }
    setThreads((prev) =>
      prev.map((thread) => (thread.id === threadId ? { ...thread, pinned } : thread)),
    );
  }, []);

  const copyAssistantMarkdown = useCallback(async (messageId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      window.setTimeout(() => {
        setCopiedMessageId((current) => (current === messageId ? null : current));
      }, 1800);
    } catch {
      setSystemNotice({
        variant: 'error',
        text: 'Could not copy to clipboard',
      });
    }
  }, []);

  const deleteThread = useCallback(async (threadId: string) => {
    const res = await fetch(`/api/agent/threads/${encodeURIComponent(threadId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setSystemNotice({
        variant: 'error',
        text: data.error || 'Could not delete conversation',
      });
      return;
    }
    setThreads((prev) => prev.filter((thread) => thread.id !== threadId));
    if (activeThreadIdRef.current === threadId) {
      persistActiveThread(null);
      setContributionDraft(null);
      setAttachments([]);
      setAttachError(null);
      setMessages([
        { id: 'intro', text: INTRO, sender: 'assistant', timestamp: new Date() },
      ]);
    }
  }, [persistActiveThread]);

  const onFilesSelected = async (files: FileList | null) => {
    if (!files?.length) return;
    if (!signedIn) {
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

  const applyStarter = (prompt: string) => {
    setInputText(prompt);
    if (!signedIn) {
      promptSignIn();
      return;
    }
    void sendMessage(prompt);
  };

  const submitChatMessage = useCallback(async ({
    text,
    priorMessages,
    threadId: explicitThreadId,
  }: {
    text: string;
    priorMessages: Message[];
    threadId?: string | null;
  }) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMessage: Message = {
      id: `${Date.now()}-u`,
      text: trimmed,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages([...priorMessages, userMessage]);
    setIsLoading(true);
    setContributionDraft(null);
    setSystemNotice(null);

    const abortController = beginChatAbort();

    try {
      let threadIdToSend = explicitThreadId ?? activeThreadIdRef.current;
      if (!threadIdToSend) {
        const createRes = await fetch('/api/agent/threads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            surface: `${surface}/agent`,
            title: trimmed.slice(0, 120) || 'New conversation',
          }),
          signal: abortController.signal,
        });
        const createData = await createRes.json();
        if (createRes.ok && createData.thread?.id) {
          threadIdToSend = createData.thread.id;
          persistActiveThread(threadIdToSend);
          setThreads((prev) => [createData.thread, ...prev.filter((t) => t.id !== createData.thread.id)]);
        }
      }

      const response = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          documents: [],
          history: historyFromMessages(priorMessages),
          surface,
          sessionId,
          threadId: threadIdToSend,
          dpFocus,
        }),
        signal: abortController.signal,
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          promptSignIn();
        }
        throw new Error(data.error || 'Request failed');
      }

      const memoryId = typeof data.memoryId === 'string' ? data.memoryId : null;
      const userId = memoryId ? `${memoryId}-u` : userMessage.id;
      const assistantId = memoryId ? `${memoryId}-a` : `${Date.now()}-a`;

      setMessages((prev) => [
        ...prev.slice(0, -1),
        { ...userMessage, id: userId, turnId: memoryId || undefined },
        {
          id: assistantId,
          text: data.response,
          sender: 'assistant',
          timestamp: new Date(),
          turnId: memoryId || undefined,
          contributionHint: data.contributionHint || null,
          citedDps: Array.isArray(data.citedDps) && data.citedDps.length
            ? data.citedDps
            : Array.isArray(data.mentionedDps)
              ? data.mentionedDps
              : [],
          truncated: Boolean(data.truncated) || looksTruncatedReply(String(data.response || '')),
        },
      ]);

      if (data.threadId) {
        persistActiveThread(data.threadId);
      }

      if (signedIn) loadThreads();
    } catch (err) {
      if (isAbortError(err)) {
        setSystemNotice({ variant: 'info', text: 'Stopped.' });
      } else {
        setSystemNotice({
          variant: 'error',
          text: userFacingError(err),
        });
      }
      setMessages(priorMessages);
    } finally {
      clearChatAbort(abortController);
      setIsLoading(false);
    }
  }, [apiPath, beginChatAbort, clearChatAbort, dpFocus, loadThreads, persistActiveThread, promptSignIn, sessionId, signedIn, surface]);

  const persistTurnAssistant = useCallback(async (
    turnId: string,
    assistantMessage: string,
    citedDps: number[],
    contributionHint: ContributionHint | null | undefined,
  ) => {
    try {
      await fetch(`/api/agent/turns/${encodeURIComponent(turnId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assistantMessage,
          citedDps,
          contributionHint: contributionHint || null,
        }),
      });
    } catch {
      /* non-fatal */
    }
  }, []);

  const continueAssistantReply = useCallback(async (assistantMessageId: string) => {
    if (!signedIn || isLoading) return;

    const assistantIdx = messages.findIndex((m) => m.id === assistantMessageId);
    if (assistantIdx < 1) return;

    const assistantMsg = messages[assistantIdx];
    const historyPrior = messages.slice(0, assistantIdx);

    setAssistantActionId(assistantMessageId);
    setIsLoading(true);
    setSystemNotice(null);

    const abortController = beginChatAbort();

    try {
      const response = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: CONTINUE_PROMPT,
          documents: [],
          history: historyFromMessages([...historyPrior, assistantMsg]),
          surface,
          sessionId,
          threadId: activeThreadIdRef.current,
          dpFocus,
          skipMemoryRecord: true,
        }),
        signal: abortController.signal,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Continue failed');

      const continuation = String(data.response || '').trim();
      const combined = continuation
        ? `${assistantMsg.text.trimEnd()}\n\n${continuation}`
        : assistantMsg.text;

      const citedDps = Array.isArray(data.citedDps) && data.citedDps.length
        ? data.citedDps
        : assistantMsg.citedDps || [];

      const nextMessage: Message = {
        ...assistantMsg,
        text: combined,
        truncated: Boolean(data.truncated) || looksTruncatedReply(combined),
        contributionHint: data.contributionHint ?? assistantMsg.contributionHint,
        citedDps,
      };

      setMessages((prev) => prev.map((m) => (m.id === assistantMessageId ? nextMessage : m)));

      if (assistantMsg.turnId) {
        await persistTurnAssistant(
          assistantMsg.turnId,
          combined,
          citedDps,
          nextMessage.contributionHint,
        );
      }
    } catch (err) {
      if (isAbortError(err)) {
        setSystemNotice({ variant: 'info', text: 'Stopped.' });
      } else {
        setSystemNotice({ variant: 'error', text: userFacingError(err) });
      }
    } finally {
      clearChatAbort(abortController);
      setAssistantActionId(null);
      setIsLoading(false);
    }
  }, [apiPath, beginChatAbort, clearChatAbort, dpFocus, isLoading, messages, persistTurnAssistant, sessionId, signedIn, surface]);

  const regenerateAssistantReply = useCallback(async (assistantMessageId: string) => {
    if (!signedIn || isLoading) return;

    const assistantIdx = messages.findIndex((m) => m.id === assistantMessageId);
    if (assistantIdx < 1) return;

    const userMsg = messages[assistantIdx - 1];
    if (userMsg.sender !== 'user') return;

    const turnId = messages[assistantIdx].turnId;
    const threadId = activeThreadIdRef.current;
    const historyPrior = messages.slice(0, assistantIdx - 1);

    setAssistantActionId(assistantMessageId);
    setIsLoading(true);
    setSystemNotice(null);
    setContributionDraft(null);

    const abortController = beginChatAbort();

    try {
      if (threadId && turnId) {
        const truncRes = await fetch(`/api/agent/threads/${encodeURIComponent(threadId)}/truncate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ turnId }),
          signal: abortController.signal,
        });
        if (!truncRes.ok) {
          const truncData = await truncRes.json().catch(() => ({}));
          throw new Error(truncData.error || 'Could not reset this reply');
        }
      }

      const response = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.text,
          documents: [],
          history: historyFromMessages(historyPrior),
          surface,
          sessionId,
          threadId,
          dpFocus,
        }),
        signal: abortController.signal,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Regenerate failed');

      const memoryId = typeof data.memoryId === 'string' ? data.memoryId : turnId || null;
      const userId = memoryId ? `${memoryId}-u` : userMsg.id;
      const assistantId = memoryId ? `${memoryId}-a` : assistantMessageId;

      setMessages([
        ...historyPrior,
        { ...userMsg, id: userId, turnId: memoryId || userMsg.turnId },
        {
          id: assistantId,
          text: data.response,
          sender: 'assistant',
          timestamp: new Date(),
          turnId: memoryId || undefined,
          contributionHint: data.contributionHint || null,
          citedDps: Array.isArray(data.citedDps) && data.citedDps.length
            ? data.citedDps
            : Array.isArray(data.mentionedDps)
              ? data.mentionedDps
              : [],
          truncated: Boolean(data.truncated) || looksTruncatedReply(String(data.response || '')),
        },
      ]);

      if (data.threadId) persistActiveThread(data.threadId);
      if (signedIn) loadThreads();
    } catch (err) {
      if (isAbortError(err)) {
        setSystemNotice({ variant: 'info', text: 'Stopped.' });
      } else {
        setSystemNotice({ variant: 'error', text: userFacingError(err) });
      }
      if (threadId) await loadThread(threadId);
    } finally {
      clearChatAbort(abortController);
      setAssistantActionId(null);
      setIsLoading(false);
    }
  }, [
    apiPath,
    beginChatAbort,
    clearChatAbort,
    dpFocus,
    isLoading,
    loadThread,
    loadThreads,
    messages,
    persistActiveThread,
    sessionId,
    signedIn,
    surface,
  ]);

  const sendMessage = async (overrideText?: string) => {
    const text = (typeof overrideText === 'string' ? overrideText : inputText).trim();
    if ((!text && attachments.length === 0) || isLoading) return;

    if (!signedIn) {
      promptSignIn();
      return;
    }

    const attachmentNames = attachments.map((doc) => doc.name);
    const displayText = text
      || (attachmentNames.length
        ? `Uploaded ${attachmentNames.join(', ')} for review`
        : '');

    if (!text && attachments.length > 0) {
      // Document-only send keeps existing attachment flow
      const userMessage: Message = {
        id: `${Date.now()}-u`,
        text: displayText,
        sender: 'user',
        timestamp: new Date(),
        attachments: attachmentNames,
      };
      setMessages((prev) => [...prev, userMessage]);
      setInputText('');
      const docsToSend = attachments;
      setAttachments([]);
      setIsLoading(true);
      const priorMessages = messages;
      const abortController = beginChatAbort();
      try {
        let threadIdToSend = activeThreadIdRef.current;
        if (!threadIdToSend) {
          const createRes = await fetch('/api/agent/threads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              surface: `${surface}/agent`,
              title: displayText.slice(0, 120) || 'New conversation',
            }),
            signal: abortController.signal,
          });
          const createData = await createRes.json();
          if (createRes.ok && createData.thread?.id) {
            threadIdToSend = createData.thread.id;
            persistActiveThread(threadIdToSend);
            setThreads((prev) => [createData.thread, ...prev.filter((t) => t.id !== createData.thread.id)]);
          }
        }
        const response = await fetch(apiPath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            documents: toDocumentPayload(docsToSend),
            history: historyFromMessages(priorMessages),
            surface,
            sessionId,
            threadId: threadIdToSend,
            dpFocus,
          }),
          signal: abortController.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Request failed');
        const memoryId = typeof data.memoryId === 'string' ? data.memoryId : null;
        setMessages((prev) => [
          ...prev.slice(0, -1),
          {
            ...prev[prev.length - 1],
            id: memoryId ? `${memoryId}-u` : prev[prev.length - 1].id,
            turnId: memoryId || undefined,
          },
          {
            id: memoryId ? `${memoryId}-a` : `${Date.now()}-a`,
            text: data.response,
            sender: 'assistant',
            timestamp: new Date(),
            turnId: memoryId || undefined,
            contributionHint: data.contributionHint || null,
            citedDps: Array.isArray(data.citedDps) ? data.citedDps : [],
          },
        ]);
        if (data.threadId) persistActiveThread(data.threadId);
        if (signedIn) loadThreads();
      } catch (err) {
        if (isAbortError(err)) {
          setSystemNotice({ variant: 'info', text: 'Stopped.' });
        } else {
          setSystemNotice({ variant: 'error', text: userFacingError(err) });
        }
        setMessages(priorMessages);
        setAttachments(docsToSend);
      } finally {
        clearChatAbort(abortController);
        setIsLoading(false);
      }
      return;
    }

    setInputText('');
    setAttachments([]);
    await submitChatMessage({ text, priorMessages: messages });
  };

  const startEditMessage = (messageId: string, currentText: string) => {
    if (!signedIn || isLoading) return;
    setEditingMessageId(messageId);
    setEditText(currentText);
  };

  const cancelEditMessage = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  const resubmitEditedMessage = async () => {
    if (!editingMessageId || editBusy) return;
    const trimmed = editText.trim();
    if (!trimmed) return;

    const msgIndex = messages.findIndex((m) => m.id === editingMessageId);
    if (msgIndex < 0) return;

    const turnId = turnIdFromMessageId(editingMessageId) || messages[msgIndex].turnId;
    const threadId = activeThreadIdRef.current;
    if (!threadId || !turnId) {
      setSystemNotice({
        variant: 'error',
        text: 'Wait for Hermes to finish replying before editing this message.',
      });
      return;
    }

    const downstreamCount = messages.slice(msgIndex + 1).filter((m) => m.id !== 'intro').length;
    if (downstreamCount > 0) {
      const ok = await DpDialog.confirm({
        title: 'Replace message?',
        message: `Replace this message and remove ${downstreamCount} later message${downstreamCount === 1 ? '' : 's'}?`,
        variant: 'warning',
        confirmLabel: 'Replace',
        cancelLabel: 'Cancel',
      });
      if (!ok) return;
    }

    setEditBusy(true);
    try {
      const truncRes = await fetch(`/api/agent/threads/${encodeURIComponent(threadId)}/truncate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turnId }),
      });
      const truncData = await truncRes.json().catch(() => ({}));
      if (!truncRes.ok) throw new Error(truncData.error || 'Could not truncate conversation');

      const priorMessages = messages.slice(0, msgIndex);
      setEditingMessageId(null);
      setEditText('');
      await submitChatMessage({ text: trimmed, priorMessages, threadId });
    } catch (err) {
      setSystemNotice({ variant: 'error', text: userFacingError(err) });
      await loadThread(threadId);
    } finally {
      setEditBusy(false);
    }
  };

  const forkEditedMessage = async () => {
    if (!editingMessageId || editBusy) return;
    const trimmed = editText.trim();
    if (!trimmed) return;

    const msgIndex = messages.findIndex((m) => m.id === editingMessageId);
    if (msgIndex < 0) return;

    const turnId = turnIdFromMessageId(editingMessageId) || messages[msgIndex].turnId;
    const threadId = activeThreadIdRef.current;
    if (!threadId || !turnId) {
      setSystemNotice({
        variant: 'error',
        text: 'Wait for Hermes to finish replying before forking from this message.',
      });
      return;
    }

    setEditBusy(true);
    let newThreadId: string | null = null;
    try {
      const forkRes = await fetch(`/api/agent/threads/${encodeURIComponent(threadId)}/fork`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turnId, surface: `${surface}/agent` }),
      });
      const forkData = await forkRes.json().catch(() => ({}));
      if (!forkRes.ok || !forkData.thread?.id) {
        throw new Error(forkData.error || 'Could not fork conversation');
      }

      newThreadId = forkData.thread.id as string;
      const priorMessages = messages.slice(0, msgIndex);
      persistActiveThread(newThreadId);
      setThreads((prev) => [forkData.thread, ...prev.filter((t) => t.id !== newThreadId)]);
      setEditingMessageId(null);
      setEditText('');
      setSystemNotice({
        variant: 'info',
        text: 'Started a forked conversation from your edit. The original thread is unchanged.',
      });
      await submitChatMessage({ text: trimmed, priorMessages, threadId: newThreadId });
    } catch (err) {
      setSystemNotice({ variant: 'error', text: userFacingError(err) });
      if (newThreadId) await loadThread(newThreadId);
    } finally {
      setEditBusy(false);
    }
  };

  const openTeachModal = (assistantMessageId: string) => {
    if (!signedIn) {
      promptSignIn();
      return;
    }

    const assistantIdx = messages.findIndex((m) => m.id === assistantMessageId);
    if (assistantIdx < 0) return;

    const userMessage = [...messages.slice(0, assistantIdx)]
      .reverse()
      .find((m) => m.sender === 'user');
    const assistantMessage = messages[assistantIdx];

    setTeachTargetId(assistantMessageId);
    setTeachUserQuestion(userMessage?.text);
    setTeachWrongReply(assistantMessage.text);
    setTeachText('');
    setTeachOpen(true);
  };

  const closeTeachModal = () => {
    setTeachOpen(false);
    setTeachTargetId(null);
    setTeachText('');
    setTeachUserQuestion(undefined);
    setTeachWrongReply(undefined);
  };

  const saveTeaching = async () => {
    if (!signedIn || !teachTargetId || !teachText.trim()) return;

    setCorrectionBusyId(teachTargetId);
    try {
      const res = await fetch('/api/agent/community-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correctedText: teachText.trim(),
          wrongReply: teachWrongReply || null,
          userQuestion: teachUserQuestion || null,
          threadId: activeThreadId,
          dpIds: dpFocus ? [`DP${dpFocus}`] : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save teaching');

      closeTeachModal();
      const noteStatus = data.note?.status;
      setSystemNotice({
        variant: 'success',
        text: noteStatus === 'verified'
          ? 'Teaching saved and active – Hermes will use this on future turns about the same DPs.'
          : 'Suggestion saved for layer admin review. Hermes will only use it after approval.',
      });
    } catch (err) {
      setSystemNotice({
        variant: 'error',
        text: userFacingError(err),
      });
    } finally {
      setCorrectionBusyId(null);
    }
  };

  const draftContribution = async (scope: ContributionScope, assistantMessageId: string) => {
    if (!signedIn) {
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
      if (!data.draft || typeof data.draft !== 'object') {
        throw new Error('Draft response was empty — try again in a moment');
      }
      setContributionDraft(data.draft);
      setSystemNotice(null);
    } catch (err) {
      setSystemNotice({
        variant: 'error',
        text: userFacingError(err),
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId && m.contributionHint?.contributionReady
            ? {
              ...m,
              contributionHint: {
                ...m.contributionHint,
                contributionReady: false,
                reason: 'Draft failed — see notice above. Send a follow-up or try again later.',
              },
            }
            : m,
        ),
      );
    } finally {
      setContributionBusy(false);
      setDraftingMessageId(null);
    }
  };

  const submitContribution = async (mode: ContributionSubmitMode) => {
    if (!contributionDraft || !signedIn) return;
    setContributionBusy(true);
    const draftRef = contributionDraft.draftRef;
    const items = proposalsFromContributionDraft(contributionDraft);
    const isDraft = mode === 'draft';
    try {
      await ensureFreshCanopiSession();
      const links: DiscussDeepLink[] = [];

      if (isDraft) {
        const res = await fetch('/api/agent/contributions/stage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            draftRef,
            proposals: items,
            threadId: activeThreadId,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.details || data.error || 'Could not save drafts');
        const staged = Array.isArray(data.staged) ? data.staged : [];
        staged.forEach((row: { proposalId?: string; link?: { id?: string; href?: string; pageId?: string }; result?: { id?: string; pageId?: string } }, index: number) => {
          const item = items.find((p) => p.id === row.proposalId) || items[index];
          if (!item) return;
          const link = resolveDiscussLink(item, draftRef, row, 'draft');
          if (link) links.push(link);
        });
        if (!links.length) {
          items.forEach((item) => {
            const link = resolveDiscussLink(item, draftRef, {}, 'draft');
            if (link) links.push(link);
          });
        }
        saveStagedProposal(contributionDraft);
      } else {
        const destination = defaultDestination();
        for (const item of items) {
          const res = await fetch('/api/agent/contributions/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              kind: item.kind,
              draftRef,
              payload: item.payload,
              destination,
              threadId: activeThreadId,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.details || data.error || 'Submit failed');
          const link = resolveDiscussLink(item, draftRef, data, 'post');
          if (link) links.push(link);
        }
      }

      setContributionDraft(null);
      const count = items.length;
      const actionLabel = isDraft ? 'saved as draft' : 'published';
      await DpDialog.alert({
        title: isDraft ? 'Drafts saved' : 'Published to Discuss',
        message: `${count} proposal${count === 1 ? '' : 's'} ${actionLabel} on ${draftRef}. Open each link below to review in Canopi Discuss.`,
        variant: 'success',
        confirmLabel: 'Done',
        links: links.map((link) => ({ href: link.href, label: link.label })),
      });
    } catch (err) {
      const message = userFacingError(err);
      const needsSignIn = /sign in again|session expired/i.test(message);
      await DpDialog.alert({
        title: isDraft ? 'Could not save drafts' : 'Could not publish',
        message,
        variant: 'danger',
        confirmLabel: needsSignIn ? 'Sign in' : 'OK',
      });
      if (needsSignIn) promptSignIn();
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
      loading={threadsLoading || Boolean(threadLoadingId)}
      signedIn={signedIn}
      onSelect={loadThread}
      onCreate={startNewConversation}
      onRename={signedIn ? renameThread : undefined}
      onPin={signedIn ? pinThread : undefined}
      onDelete={signedIn ? deleteThread : undefined}
      onSignIn={promptSignIn}
      onClose={() => setSidebarOpen(false)}
    />
  );

  return (
    <div className={shellClass}>
      {/* Desktop sidebar – fixed to viewport left, full height below site header */}
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
            {threadLoadError ? (
              <p className="rounded-lg border border-rose-800/60 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
                {threadLoadError}
              </p>
            ) : null}
            {systemNotice ? (
              <div
                className={`rounded-lg border px-3 py-2 text-sm ${
                  systemNotice.variant === 'error'
                    ? 'border-rose-800/60 bg-rose-950/30 text-rose-200'
                    : systemNotice.variant === 'success'
                      ? 'border-emerald-800/60 bg-emerald-950/30 text-emerald-200'
                      : 'border-slate-700 bg-slate-900/80 text-slate-200'
                }`}
              >
                <p>{systemNotice.text}</p>
                {systemNotice.links?.length ? (
                  <ul className="mt-2 space-y-1">
                    {systemNotice.links.map((link) => (
                      <li key={link.id}>
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-cyan-300 underline decoration-cyan-600/60 underline-offset-2 hover:text-cyan-200"
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`group flex w-full ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[80%] sm:text-base ${
                    message.sender === 'user'
                      ? 'bg-cyan-700 text-white'
                      : 'text-slate-100'
                  }`}
                  title={
                    message.sender === 'user' && editingMessageId !== message.id
                      ? formatUserMessageTimestamp(message.timestamp)
                      : undefined
                  }
                >
                  {message.sender === 'assistant' ? (
                    <HermesMarkdown text={message.text} variant="dark" />
                  ) : editingMessageId === message.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={4}
                        disabled={editBusy || isLoading}
                        className="w-full resize-y rounded-lg border border-cyan-500/50 bg-cyan-950/40 px-3 py-2 text-sm text-white placeholder:text-cyan-200/50 focus:border-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-300 disabled:opacity-60"
                        aria-label="Edit message"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={editBusy || isLoading || !editText.trim()}
                          onClick={() => void resubmitEditedMessage()}
                          className="rounded-md bg-white px-2.5 py-1 text-[11px] font-medium text-cyan-800 hover:bg-cyan-50 disabled:opacity-50"
                        >
                          {editBusy ? 'Sending…' : 'Resubmit'}
                        </button>
                        <button
                          type="button"
                          disabled={editBusy || isLoading || !editText.trim()}
                          onClick={() => void forkEditedMessage()}
                          className="rounded-md border border-white/60 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
                        >
                          Fork
                        </button>
                        <button
                          type="button"
                          disabled={editBusy}
                          onClick={cancelEditMessage}
                          className="rounded-md px-2.5 py-1 text-[11px] text-cyan-100/80 hover:text-white disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                      <p className="text-[10px] text-cyan-100/70">
                        Resubmit replaces later messages in this thread. Fork keeps the original and starts a new branch.
                      </p>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.text}</p>
                  )}
                  {message.sender === 'assistant'
                    && message.id === 'intro'
                    && messages.length === 1 ? (
                    <div className="mt-3 space-y-2">
                      {starterLabel ? (
                        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-cyan-400/90">
                          {starterLabel}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        {visibleStarters.map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            onClick={() => applyStarter(prompt)}
                            className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-left text-[11px] text-slate-300 hover:border-cyan-700 hover:text-cyan-100"
                          >
                            {prompt.length > 120 ? `${prompt.slice(0, 117)}…` : prompt}
                          </button>
                        ))}
                      </div>
                      {!signedIn ? (
                        <p className="text-[11px] text-slate-500">Sign in to send a starter.</p>
                      ) : null}
                    </div>
                  ) : null}
                  {message.sender === 'assistant'
                    && message.citedDps?.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {message.citedDps.slice(0, 6).map((dpNum) => (
                        <Link
                          key={`${message.id}-dp-${dpNum}`}
                          href={dpDetailHref(`DP${dpNum}`, fromPath)}
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                            dpNum >= 1 && dpNum <= 22
                              ? 'border-slate-600 bg-slate-900 text-slate-200'
                              : 'border-amber-700/70 bg-amber-950/40 text-amber-200'
                          }`}
                        >
                          DP{dpNum} · {dpChipLabel(dpNum)}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                  {message.sender === 'assistant'
                    && message.id !== 'intro' ? (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-700/60 pt-2">
                      {(message.truncated || looksTruncatedReply(message.text)) ? (
                        <p className="mb-1 w-full text-[11px] text-amber-200/90">
                          Response may be incomplete.
                        </p>
                      ) : null}
                      {(message.truncated || looksTruncatedReply(message.text)) ? (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => void continueAssistantReply(message.id)}
                          className="rounded-md border border-amber-700/70 bg-amber-950/30 px-2 py-1 text-[11px] text-amber-100 hover:bg-amber-950/50 disabled:opacity-50"
                        >
                          {assistantActionId === message.id && isLoading ? 'Continuing…' : 'Continue'}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => void regenerateAssistantReply(message.id)}
                        className="rounded-md border border-slate-600 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800/80 disabled:opacity-50"
                      >
                        {assistantActionId === message.id && isLoading ? 'Regenerating…' : 'Regenerate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void copyAssistantMarkdown(message.id, message.text)}
                        className="rounded-md border border-slate-600 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800/80"
                      >
                        {copiedMessageId === message.id ? 'Copied' : 'Copy markdown'}
                      </button>
                      <button
                        type="button"
                        disabled={correctionBusyId === message.id}
                        onClick={() => openTeachModal(message.id)}
                        className="rounded-md border border-cyan-700/60 px-2 py-1 text-[11px] text-cyan-200 hover:bg-cyan-950/40 disabled:opacity-50"
                      >
                        {correctionBusyId === message.id ? 'Saving…' : 'Teach Hermes'}
                      </button>
                    </div>
                  ) : null}
                  {message.sender === 'assistant'
                    && message.contributionHint?.contributionReady ? (
                    <HermesContributionCTA
                      hint={message.contributionHint}
                      busy={contributionBusy && draftingMessageId === message.id}
                      signedIn={signedIn}
                      onDraft={(scope) => draftContribution(scope, message.id)}
                      onSignIn={promptSignIn}
                    />
                  ) : null}
                  {message.attachments?.length ? (
                    <p className="mt-2 text-[11px] opacity-80">
                      Attached: {message.attachments.join(', ')}
                    </p>
                  ) : null}
                  {message.sender === 'user'
                    && editingMessageId !== message.id
                    && signedIn
                    && !isLoading ? (
                    <div className="mt-2 flex justify-end opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                      <button
                        type="button"
                        onClick={() => startEditMessage(message.id, message.text)}
                        className="rounded-md border border-white/30 px-2 py-0.5 text-[10px] text-white/90 hover:bg-cyan-600/60"
                      >
                        Edit
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}

            {contributionDraft ? (
              <HermesContributionPanel
                draft={contributionDraft}
                busy={contributionBusy}
                onSubmit={submitContribution}
                onCancel={() => setContributionDraft(null)}
                onDraftChange={setContributionDraft}
              />
            ) : null}

            {isLoading && (
              <div className="flex items-center justify-start gap-3">
                <div className="rounded-2xl px-4 py-3 text-slate-300">
                  <span className="inline-flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400 [animation-delay:0.1s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400 [animation-delay:0.2s]" />
                  </span>
                </div>
                <button
                  type="button"
                  onClick={stopChat}
                  className="rounded-lg border border-rose-800/60 px-3 py-1.5 text-xs font-medium text-rose-200 hover:border-rose-600 hover:bg-rose-950/40"
                >
                  Stop
                </button>
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
              <div className="relative min-h-10 flex-1">
                <textarea
                  ref={composerRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={
                    signedIn
                      ? 'Message Hermes…'
                      : 'Sign in to send a message…'
                  }
                  className="max-h-40 min-h-10 w-full resize-none bg-transparent px-1 py-2.5 pb-10 text-sm leading-5 text-white placeholder:text-slate-500 focus:outline-none"
                  rows={1}
                  disabled={isLoading}
                />
                {signedIn ? (
                  <HermesComposerAiAssist
                    textareaRef={composerRef}
                    value={inputText}
                    onValueChange={setInputText}
                    surface={surface}
                    dpFocus={dpFocus}
                    disabled={isLoading}
                    onSendResponse={(text) => void sendMessage(text)}
                  />
                ) : null}
              </div>
              <button
                type="button"
                onClick={signedIn ? (isLoading ? stopChat : () => void sendMessage()) : promptSignIn}
                disabled={
                  (!signedIn && loginBusy)
                  || (signedIn && !isLoading && !inputText.trim() && attachments.length === 0)
                }
                className={
                  signedIn
                    ? isLoading
                      ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-rose-800/60 bg-rose-950/40 text-rose-200 hover:border-rose-600 hover:bg-rose-950/70'
                      : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-700 text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400'
                    : 'flex h-10 shrink-0 items-center justify-center rounded-lg bg-cyan-700 px-3 text-xs font-medium text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400'
                }
                aria-label={signedIn ? (isLoading ? 'Stop generating' : 'Send message') : 'Sign in to chat'}
              >
                {signedIn ? (
                  isLoading ? (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <rect x="6" y="6" width="12" height="12" rx="1" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  )
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
            </div>
          </div>
        </div>
      </div>

      <HermesTeachModal
        open={teachOpen}
        busy={Boolean(correctionBusyId)}
        userQuestion={teachUserQuestion}
        wrongReply={teachWrongReply}
        value={teachText}
        onChange={setTeachText}
        onCancel={closeTeachModal}
        onSave={saveTeaching}
      />

      <DpDialogHost />
    </div>
  );
}
