'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { DpDialog, DpDialogHost } from '@/components/DpDialog';
import HermesComposerAiAssist from '@/components/HermesComposerAiAssist';
import HermesContributionCTA from '@/components/HermesContributionCTA';
import HermesContributionPanel from '@/components/HermesContributionPanel';
import HermesMarkdown from '@/components/HermesMarkdown';
import HermesTeachModal from '@/components/HermesTeachModal';
import HermesPromptStackRail from '@/components/HermesPromptStackRail';
import HermesThreadSidebar, { type HermesThreadSummary } from '@/components/HermesThreadSidebar';
import { usePromptStack } from '@/lib/usePromptStack';
import HermesContributionLedger from '@/components/HermesContributionLedger';
import { bookDiscussDraftHref, bookDiscussHref, bookDiscussPostHref } from '@/lib/govhub';
import {
  buildEditDraftFromProposal,
  buildProposalUpdates,
  buildRevisionDraftFromProposal,
  clearPendingContributionDraft,
  clearPendingUserMessage,
  clearStagedProposalsForRef,
  clearPendingDraftIfFiledOnThread,
  clearStagedProposalsForFiledRefs,
  defaultDestination,
  discussLinkLabel,
  enrichProposalsWithLedgerDraftIds,
  filedSetsForSourceTurn,
  formatContributionSubmissionMarkdown,
  formatContributionUserSummary,
  inferContributionHint,
  initializeDraftForEditing,
  isContributionRecordHint,
  isReplaceSubmitMode,
  loadPendingContributionDraft,
  loadStagedProposals,
  markHintSubmitted,
  mergeContributionSetForPartialSave,
  mergePendingUserMessagesIntoThread,
  migratePendingUserMessages,
  proposalFingerprint,
  proposalsFromContributionDraft,
  proposalsToStage,
  resolveContributionEditContext,
  savePendingContributionDraft,
  savePendingUserMessage,
  saveStagedProposal,
  shouldBlockDraftRestore,
  shouldShowContributionCTA,
  sourceTurnHasFiledSet,
  submittedProposalExclusionsFromMessages,
} from '@/lib/hermesContribution';
import type {
  ContributionDraft,
  ContributionEditContext,
  ContributionHint,
  ContributionProposal,
  ContributionRecordHint,
  ContributionScope,
  ContributionSet,
  ContributionSubmitMode,
  DiscussDeepLink,
  LedgerProposal,
  MessageContributionHint,
} from '@/lib/hermesContribution';
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
  contributionHint?: MessageContributionHint | null;
  citedDps?: number[];
  turnId?: string;
  truncated?: boolean;
  /** True for user/assistant pair recording a contribution submit. */
  contributionRecord?: boolean;
  /** User message persisted locally after a failed send — offer retry. */
  pendingSend?: boolean;
  sendError?: string | null;
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

const STOPPED_BEFORE_REPLY = 'Stopped before Hermes replied.';

function isStoppedChatRequest(
  err: unknown,
  response?: Response,
  data?: { error?: string },
): boolean {
  if (isAbortError(err)) return true;
  if (response && (response.status === 499 || data?.error === 'Aborted')) return true;
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

function turnIdFromAssistantMessageId(messageId: string): string | null {
  if (!messageId.endsWith('-a')) return null;
  const turnId = messageId.slice(0, -2);
  return turnId && turnId !== 'intro' ? turnId : null;
}

/** Hide draft CTA on assistant turns already filed in the ledger or with a record after them. */
function suppressSubmittedContributionHints(
  messages: Message[],
  contributionSets: ContributionSet[],
): Message[] {
  const recordIndices = messages
    .map((m, i) => (isContributionRecordHint(m.contributionHint) || m.contributionRecord ? i : -1))
    .filter((i) => i >= 0);

  return messages.map((m, idx) => {
    if (m.sender !== 'assistant' || isContributionRecordHint(m.contributionHint)) return m;

    const turnId = m.turnId || turnIdFromAssistantMessageId(m.id);
    const filedInLedger = sourceTurnHasFiledSet(contributionSets, turnId);
    const draftRefHint = m.contributionHint && 'draftRefHint' in m.contributionHint
      ? m.contributionHint.draftRefHint
      : null;
    const filedForRefAndTurn = draftRefHint
      ? filedSetsForSourceTurn(contributionSets, turnId).some(
        (s) => String(s.draftRef || '').trim().toUpperCase()
          === String(draftRefHint || '').trim().toUpperCase(),
      )
      : false;
    const hasRecordAfter = recordIndices.some((ri) => ri > idx);
    if (!filedInLedger && !hasRecordAfter && !filedForRefAndTurn) return m;

    if (m.contributionHint && 'contributionSubmitted' in m.contributionHint && m.contributionHint.contributionSubmitted) {
      return m;
    }
    if (!m.contributionHint || !('contributionReady' in m.contributionHint) || !m.contributionHint.contributionReady) {
      return m;
    }
    const draftRef =
      ('submittedDraftRef' in m.contributionHint && m.contributionHint.submittedDraftRef)
      || m.contributionHint.draftRefHint
      || 'ML-5';
    return {
      ...m,
      contributionHint: markHintSubmitted(m.contributionHint, String(draftRef), 'publish'),
    };
  });
}

function findContributionHydrateIndex(
  messages: Message[],
  contributionSets: ContributionSet[],
): number {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m.sender !== 'assistant' || m.id === 'intro') continue;
    if (isContributionRecordHint(m.contributionHint) || m.contributionRecord) continue;
    if (m.contributionHint && 'contributionSubmitted' in m.contributionHint && m.contributionHint.contributionSubmitted) {
      continue;
    }
    const turnId = m.turnId || turnIdFromAssistantMessageId(m.id);
    if (sourceTurnHasFiledSet(contributionSets, turnId)) continue;
    const hasRecordAfter = messages
      .slice(i + 1)
      .some((later) => isContributionRecordHint(later.contributionHint) || later.contributionRecord);
    if (hasRecordAfter) continue;
    return i;
  }
  return -1;
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
  contributionSets: ContributionSet[],
): Promise<Message[]> {
  const lastAssistantIdx = findContributionHydrateIndex(messages, contributionSets);
  if (lastAssistantIdx < 0) return messages;

  const assistantMessage = messages[lastAssistantIdx];
  const assistantTurnId = assistantMessage.turnId || turnIdFromAssistantMessageId(assistantMessage.id);
  if (shouldShowContributionCTA(assistantMessage.contributionHint, {
    sourceTurnId: assistantTurnId,
    contributionSets,
  })) {
    return messages;
  }
  if (sourceTurnHasFiledSet(contributionSets, assistantTurnId)) return messages;

  const hintDraftRef = assistantMessage.contributionHint
    && 'draftRefHint' in assistantMessage.contributionHint
    ? assistantMessage.contributionHint.draftRefHint
    : null;
  const inferredRef = hintDraftRef || (dpFocus ? `ML-${dpFocus}` : null);
  if (inferredRef && filedSetsForSourceTurn(contributionSets, assistantTurnId).some(
    (s) => String(s.draftRef || '').trim().toUpperCase()
      === String(inferredRef).trim().toUpperCase(),
  )) {
    return messages;
  }

  const userMessage = [...messages.slice(0, lastAssistantIdx)]
    .reverse()
    .find((m) => m.sender === 'user' && !m.contributionRecord);
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
  const [contributionSets, setContributionSets] = useState<ContributionSet[]>([]);
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLElement>>(new Map());
  const contributionPanelRef = useRef<HTMLDivElement>(null);
  const draftingMessageIdRef = useRef<string | null>(null);
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
      const sets: ContributionSet[] = Array.isArray(data.thread?.contributionSets)
        ? data.thread.contributionSets
        : [];
      setContributionSets(sets);
      clearStagedProposalsForFiledRefs(sets);
      clearPendingDraftIfFiledOnThread(sets, threadId);
      const restored: Message[] = [
        {
          id: 'intro',
          text: INTRO,
          sender: 'assistant',
          timestamp: new Date(),
        },
      ];
      for (const turn of turns) {
        const isRecord = isContributionRecordHint(turn.contributionHint);
        if (turn.user) {
          restored.push({
            id: `${turn.id}-u`,
            text: turn.user,
            sender: 'user',
            timestamp: turn.createdAt ? new Date(turn.createdAt) : new Date(),
            turnId: turn.id,
            contributionRecord: isRecord,
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
            contributionRecord: isRecord,
          });
        }
      }
      const hydrated = await hydrateLastContributionHint(
        suppressSubmittedContributionHints(restored, sets),
        dpFocus,
        sets,
      );
      setMessages(mergePendingUserMessagesIntoThread(hydrated, threadId));
      const pending = loadPendingContributionDraft(threadId);
      if (pending?.draft) {
        const assistantTurnId = pending.assistantMessageId
          ? turnIdFromAssistantMessageId(pending.assistantMessageId)
          : null;
        const filed = await shouldBlockDraftRestore(pending.draft, sets, assistantTurnId);
        if (!filed) {
          setContributionDraft(initializeDraftForEditing(pending.draft, sets));
          draftingMessageIdRef.current = pending.assistantMessageId || null;
          setSystemNotice({
            variant: 'info',
            text: 'Restored your in-progress contribution draft from this session.',
          });
        } else {
          setContributionDraft(null);
          clearPendingContributionDraft();
          clearStagedProposalsForRef(pending.draft.draftRef);
        }
      } else {
        let restoredStaged: ContributionDraft | null = null;
        for (const row of loadStagedProposals()) {
          if (await shouldBlockDraftRestore(row, sets)) continue;
          restoredStaged = row;
          break;
        }
        if (restoredStaged) {
          setContributionDraft(initializeDraftForEditing(restoredStaged, sets));
          draftingMessageIdRef.current = null;
          setSystemNotice({
            variant: 'info',
            text: 'Restored your last locally saved contribution draft. Review and submit when ready.',
          });
        } else {
          setContributionDraft(null);
        }
      }
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
    clearPendingContributionDraft();
    setContributionSets([]);
    setContributionDraft(null);
    setAttachments([]);
    setAttachError(null);
    setSystemNotice(null);
    setMessages([
      { id: 'intro', text: INTRO, sender: 'assistant', timestamp: new Date() },
    ]);
  };

  const updateContributionDraft = useCallback((draft: ContributionDraft | null) => {
    setContributionDraft(draft);
    if (draft) {
      savePendingContributionDraft(
        draft,
        activeThreadIdRef.current,
        draftingMessageIdRef.current,
      );
    }
  }, []);

  const cancelContributionDraft = useCallback(async () => {
    if (contributionDraft) {
      const ok = await DpDialog.confirm({
        title: 'Discard contribution draft?',
        message: 'Your edits will stay in local backup until you submit successfully. Discard the open panel?',
        variant: 'warning',
        confirmLabel: 'Discard',
        cancelLabel: 'Keep editing',
      });
      if (!ok) return;
    }
    setContributionDraft(null);
    clearPendingContributionDraft();
  }, [contributionDraft]);

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
    resendClientId,
  }: {
    text: string;
    priorMessages: Message[];
    threadId?: string | null;
    resendClientId?: string;
  }) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMessage: Message = {
      id: resendClientId || `${Date.now()}-u`,
      text: trimmed,
      sender: 'user',
      timestamp: new Date(),
    };

    const optimistic = [...priorMessages, userMessage];
    setMessages(optimistic);
    setIsLoading(true);
    setSystemNotice(null);

    const threadIdForPending = explicitThreadId ?? activeThreadIdRef.current;
    savePendingUserMessage({
      clientId: userMessage.id,
      threadId: threadIdForPending,
      text: trimmed,
      timestamp: userMessage.timestamp.toISOString(),
    });

    const abortController = beginChatAbort();

    try {
      let threadIdToSend = threadIdForPending;
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
          migratePendingUserMessages(null, createData.thread.id);
          savePendingUserMessage({
            clientId: userMessage.id,
            threadId: createData.thread.id,
            text: trimmed,
            timestamp: userMessage.timestamp.toISOString(),
          });
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
        if (isStoppedChatRequest(null, response, data)) {
          savePendingUserMessage({
            clientId: userMessage.id,
            threadId: threadIdForPending,
            text: trimmed,
            timestamp: userMessage.timestamp.toISOString(),
            sendError: STOPPED_BEFORE_REPLY,
          });
          setMessages([
            ...priorMessages,
            { ...userMessage, pendingSend: true, sendError: STOPPED_BEFORE_REPLY },
          ]);
          setSystemNotice({ variant: 'info', text: 'Stopped.' });
          return;
        }
        if (response.status === 401) {
          promptSignIn();
        }
        throw new Error(data.error || 'Request failed');
      }

      clearPendingUserMessage(userMessage.id, threadIdToSend || threadIdForPending);

      const memoryId = typeof data.memoryId === 'string' ? data.memoryId : null;
      const userId = memoryId ? `${memoryId}-u` : userMessage.id;
      const assistantId = memoryId ? `${memoryId}-a` : `${Date.now()}-a`;

      setMessages((prev) => [
        ...prev.slice(0, -1),
        { ...userMessage, id: userId, turnId: memoryId || undefined, pendingSend: false, sendError: null },
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
      if (isStoppedChatRequest(err)) {
        savePendingUserMessage({
          clientId: userMessage.id,
          threadId: threadIdForPending,
          text: trimmed,
          timestamp: userMessage.timestamp.toISOString(),
          sendError: STOPPED_BEFORE_REPLY,
        });
        setMessages([
          ...priorMessages,
          { ...userMessage, pendingSend: true, sendError: STOPPED_BEFORE_REPLY },
        ]);
        setSystemNotice({ variant: 'info', text: 'Stopped.' });
      } else {
        const errorText = userFacingError(err);
        setSystemNotice({
          variant: 'error',
          text: errorText,
        });
        savePendingUserMessage({
          clientId: userMessage.id,
          threadId: threadIdForPending,
          text: trimmed,
          timestamp: userMessage.timestamp.toISOString(),
          sendError: errorText,
        });
        setMessages([
          ...priorMessages,
          { ...userMessage, pendingSend: true, sendError: errorText },
        ]);
      }
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
        if (isStoppedChatRequest(err)) {
          setSystemNotice({ variant: 'info', text: 'Stopped.' });
        } else {
          setSystemNotice({ variant: 'error', text: userFacingError(err) });
          setMessages(priorMessages);
          setAttachments(docsToSend);
        }
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

  const retryFailedMessage = async (messageId: string) => {
    if (!signedIn || isLoading) return;
    const msgIndex = messages.findIndex((m) => m.id === messageId);
    if (msgIndex < 0) return;
    const msg = messages[msgIndex];
    if (!msg.pendingSend) return;
    await submitChatMessage({
      text: msg.text,
      priorMessages: messages.slice(0, msgIndex),
      threadId: activeThreadIdRef.current,
      resendClientId: msg.id,
    });
  };

  const startEditDraft = useCallback((
    set: ContributionSet,
    proposal: LedgerProposal,
    recordMarkdown: string,
  ) => {
    if (!signedIn) {
      promptSignIn();
      return;
    }
    const draft = buildEditDraftFromProposal(set, proposal, recordMarkdown);
    if (!draft) {
      setSystemNotice({
        variant: 'error',
        text: 'Could not load this draft for editing. Try Open in Discuss instead.',
      });
      return;
    }
    setContributionDraft(initializeDraftForEditing(draft, contributionSets));
    draftingMessageIdRef.current = null;
    setDraftingMessageId(null);
    savePendingContributionDraft(draft, activeThreadIdRef.current, null);
    setSystemNotice({
      variant: 'info',
      text: 'Draft opened for editing — choose Update draft or Replace live post when you submit.',
    });
    contributionPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [promptSignIn, signedIn]);

  const startRevision = useCallback((
    set: ContributionSet,
    proposal: LedgerProposal,
    recordMarkdown: string,
  ) => {
    if (!signedIn) {
      promptSignIn();
      return;
    }
    const draft = buildRevisionDraftFromProposal(set, proposal, recordMarkdown);
    if (!draft) {
      setSystemNotice({
        variant: 'error',
        text: 'Could not load this proposal for revision. Try Open in Discuss instead.',
      });
      return;
    }
    setContributionDraft(initializeDraftForEditing(draft, contributionSets));
    draftingMessageIdRef.current = null;
    setDraftingMessageId(null);
    savePendingContributionDraft(draft, activeThreadIdRef.current, null);
    setSystemNotice({
      variant: 'info',
      text: 'Revision opened — choose Save revision draft or Replace published post when you submit.',
    });
    contributionPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [promptSignIn, signedIn]);

  const draftContribution = async (scope: ContributionScope, assistantMessageId: string) => {
    if (!signedIn) {
      promptSignIn();
      return;
    }

    const assistantIdx = messages.findIndex((m) => m.id === assistantMessageId);
    if (assistantIdx < 0) return;

    const assistantMessage = messages[assistantIdx];
    const assistantTurnId = assistantMessage.turnId || turnIdFromAssistantMessageId(assistantMessageId);
    const hint = assistantMessage.contributionHint;
    const draftHint = hint && !isContributionRecordHint(hint) ? hint : null;

    if (sourceTurnHasFiledSet(contributionSets, assistantTurnId)) {
      const filedSets = filedSetsForSourceTurn(contributionSets, assistantTurnId);
      const linkLines = filedSets.flatMap((s) => (s.proposals || [])
        .filter((p) => p.href)
        .map((p) => `- [${p.label}](${p.href})`)).slice(0, 6);
      await DpDialog.alert({
        title: 'Already filed',
        message: linkLines.length
          ? `This exchange was already submitted to the ledger.\n\n${linkLines.join('\n')}\n\nSee the contribution timeline below for details.`
          : 'This exchange was already submitted to the ledger. See the contribution timeline below.',
        variant: 'info',
        confirmLabel: 'OK',
      });
      return;
    }

    const userMessage = [...messages.slice(0, assistantIdx)]
      .reverse()
      .find((m) => m.sender === 'user');
    if (!userMessage?.text) return;

    const history = messages
      .slice(0, assistantIdx)
      .filter((m) => m.id !== 'intro' && m.id !== userMessage.id)
      .slice(-10)
      .map((m) => ({ text: m.text, sender: m.sender }));

    const excludeProposals = submittedProposalExclusionsFromMessages(messages);
    setContributionBusy(true);
    setDraftingMessageId(assistantMessageId);
    draftingMessageIdRef.current = assistantMessageId;
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
          kind: draftHint?.suggestedKind || undefined,
          draftRef: draftHint?.draftRefHint || undefined,
          excludeProposals,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not draft contribution');
      if (!data.draft || typeof data.draft !== 'object') {
        throw new Error('Draft response was empty — try again in a moment');
      }
      setContributionDraft(initializeDraftForEditing(data.draft, contributionSets));
      savePendingContributionDraft(
        data.draft,
        activeThreadIdRef.current,
        assistantMessageId,
      );
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
    const editContext: ContributionEditContext = resolveContributionEditContext(
      contributionDraft,
      contributionSets,
    );
    const draftWithContext = initializeDraftForEditing(
      { ...contributionDraft, editContext },
      contributionSets,
    );
    let items = enrichProposalsWithLedgerDraftIds(
      proposalsFromContributionDraft(draftWithContext),
      contributionSets,
      draftRef,
    );
    const stageItems = proposalsToStage(draftWithContext, items);
    const replacing = isReplaceSubmitMode(mode, editContext);
    const isDraft = mode === 'draft';

    if (editContext !== 'new' && stageItems.length === 0) {
      setContributionBusy(false);
      await DpDialog.alert({
        title: 'No changes to save',
        message: 'Edit at least one proposal before saving.',
        variant: 'info',
        confirmLabel: 'OK',
      });
      return;
    }

    if (isDraft && editContext === 'draft_id_already_published') {
      items = items.map(({ canopiDraftId: _omit, ...rest }) => rest);
    }
    const itemsToSubmit = isDraft && editContext === 'draft_id_already_published'
      ? proposalsToStage(draftWithContext, items)
      : stageItems;

    try {
      await ensureFreshCanopiSession();
      const links: DiscussDeepLink[] = [];

      if (replacing) {
        const publishItems = itemsToSubmit.map((item) => ({
          ...item,
          replaceMessageId:
            editContext === 'edit_draft'
              ? undefined
              : (contributionDraft.canopiMessageId
                || String(item.payload?.supersedes_message_id || item.payload?.supersedesMessageId || '')),
        }));
        const res = await fetch('/api/agent/contributions/publish-edits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            draftRef,
            proposals: publishItems,
            editContext,
            threadId: activeThreadId,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.details || data.error || 'Could not replace published post');
        const published = Array.isArray(data.published) ? data.published : [];
        published.forEach((
          row: { proposalId?: string; link?: { id?: string; href?: string; pageId?: string }; result?: { id?: string; pageId?: string } },
          index: number,
        ) => {
          const item = itemsToSubmit.find((p) => p.id === row.proposalId) || itemsToSubmit[index];
          if (!item) return;
          const link = resolveDiscussLink(item, draftRef, row, 'post');
          if (link) links.push(link);
        });
      } else if (isDraft) {
        const res = await fetch('/api/agent/contributions/stage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            draftRef,
            proposals: itemsToSubmit,
            threadId: activeThreadId,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.details || data.error || 'Could not save drafts');
        const staged = Array.isArray(data.staged) ? data.staged : [];
        staged.forEach((row: { proposalId?: string; link?: { id?: string; href?: string; pageId?: string }; result?: { id?: string; pageId?: string } }, index: number) => {
          const item = itemsToSubmit.find((p) => p.id === row.proposalId) || itemsToSubmit[index];
          if (!item) return;
          const link = resolveDiscussLink(item, draftRef, row, 'draft');
          if (link) links.push(link);
        });
        if (!links.length) {
          itemsToSubmit.forEach((item) => {
            const link = resolveDiscussLink(item, draftRef, {}, 'draft');
            if (link) links.push(link);
          });
        }
        saveStagedProposal(draftWithContext);
      } else {
        const destination = defaultDestination();
        for (const item of itemsToSubmit) {
          const res = await fetch('/api/agent/contributions/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              kind: item.kind,
              draftRef,
              payload: item.payload,
              destination,
              threadId: activeThreadId,
              proposalId: item.id,
              canopiDraftId: item.canopiDraftId || null,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.details || data.error || 'Submit failed');
          const link = resolveDiscussLink(item, draftRef, data, 'post');
          if (link) links.push(link);
        }
      }

      setContributionDraft(null);
      clearPendingContributionDraft();
      clearStagedProposalsForRef(draftRef);

      const count = itemsToSubmit.length;
      const userSummary = formatContributionUserSummary(draftWithContext, mode, count);
      const bodyMarkdown = formatContributionSubmissionMarkdown(draftWithContext, mode, links);
      const threadId = activeThreadIdRef.current;
      const sourceAssistantMessageId = draftingMessageIdRef.current;
      const sourceTurnId =
        messages.find((m) => m.id === sourceAssistantMessageId)?.turnId
        || (sourceAssistantMessageId ? turnIdFromAssistantMessageId(sourceAssistantMessageId) : null);

      const proposalsWithFp = await Promise.all(
        itemsToSubmit.map(async (p) => ({
          ...p,
          fingerprint: await proposalFingerprint(p, contributionDraft.supersedesMessageId),
        })),
      );
      const existingSet = draftWithContext.editSetId
        ? contributionSets.find((s) => s.id === draftWithContext.editSetId)
        : undefined;
      const contributionSet = threadId
        ? mergeContributionSetForPartialSave(
          threadId,
          sourceTurnId,
          draftWithContext,
          replacing ? 'replace' : mode,
          proposalsWithFp,
          existingSet,
          {
            supersedesMessageId: contributionDraft.supersedesMessageId,
            supersedesSetId: contributionDraft.supersedesSetId,
            revisionOfProposalId: contributionDraft.revisionOfProposalId,
          },
        )
        : null;
      const proposalUpdates = await buildProposalUpdates(itemsToSubmit, links, mode, editContext);

      const recordHint: ContributionRecordHint = {
        type: 'contribution_record',
        contributionReady: false,
        mode,
        draftRef,
        destination: defaultDestination(),
        links,
        title: contributionDraft.title,
        setId: contributionSet?.id,
        sourceTurnId,
      };

      let recordTurnId: string | null = null;

      if (threadId) {
        try {
          const recordRes = await fetch(
            `/api/agent/threads/${encodeURIComponent(threadId)}/contribution-record`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userSummary,
                bodyMarkdown,
                sourceTurnId,
                contributionSet,
                proposalUpdates,
                meta: {
                  mode,
                  draftRef,
                  destination: defaultDestination(),
                  links,
                  title: contributionDraft.title,
                  sourceTurnId,
                  setId: contributionSet?.id,
                  draft: contributionDraft,
                },
              }),
            },
          );
          const recordData = await recordRes.json().catch(() => ({}));
          if (recordRes.ok && recordData.turn?.id) {
            recordTurnId = recordData.turn.id;
            if (recordData.turn.contributionSet) {
              setContributionSets((prev) => {
                const next = prev.filter((s) => s.id !== recordData.turn.contributionSet.id);
                return [...next, recordData.turn.contributionSet];
              });
            } else if (contributionSet) {
              setContributionSets((prev) => [
                ...prev.filter((s) => s.id !== contributionSet.id),
                { ...contributionSet, status: 'complete', recordTurnId },
              ]);
            }
          }
        } catch {
          /* still show in UI even if persistence fails */
        }
      }

      const now = new Date();
      const turnKey = recordTurnId || `local-${Date.now()}`;
      const submittedHint = sourceAssistantMessageId
        ? messages.find((m) => m.id === sourceAssistantMessageId)?.contributionHint
        : null;

      setMessages((prev) => {
        const marked = sourceAssistantMessageId && submittedHint && !isContributionRecordHint(submittedHint)
          ? prev.map((m) =>
            m.id === sourceAssistantMessageId
              ? {
                ...m,
                contributionHint: markHintSubmitted(submittedHint as ContributionHint, draftRef, mode),
              }
              : m,
          )
          : prev;
        return [
          ...marked,
          {
            id: `${turnKey}-u`,
            text: userSummary,
            sender: 'user',
            timestamp: now,
            turnId: recordTurnId || undefined,
            contributionRecord: true,
          },
          {
            id: `${turnKey}-a`,
            text: bodyMarkdown,
            sender: 'assistant',
            timestamp: now,
            turnId: recordTurnId || undefined,
            contributionHint: recordHint,
            contributionRecord: true,
          },
        ];
      });
      draftingMessageIdRef.current = null;
      setDraftingMessageId(null);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      const message = userFacingError(err);
      const needsSignIn = /sign in again|session expired/i.test(message);
      if (contributionDraft) {
        savePendingContributionDraft(
          contributionDraft,
          activeThreadIdRef.current,
          draftingMessageIdRef.current,
        );
        saveStagedProposal(contributionDraft);
      }
      contributionPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      await DpDialog.alert({
        title: isDraft ? 'Could not save drafts' : 'Could not publish',
        message: `${message}\n\nYour draft is still open below — nothing was lost. Try Save to my drafts, or edit and retry.`,
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

  const promptStack = usePromptStack({
    messages,
    scrollContainerRef,
    messageRefs,
    enabled: !compact,
  });

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

        <div className="relative min-h-0 flex-1">
          <div
            ref={scrollContainerRef}
            className={`h-full overflow-y-auto ${!compact ? 'md:pr-14' : ''}`}
          >
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
                id={`hermes-msg-${message.id}`}
                ref={(el) => {
                  if (el) messageRefs.current.set(message.id, el);
                  else messageRefs.current.delete(message.id);
                }}
                className={`group flex w-full scroll-mt-4 ${message.sender === 'user' ? 'justify-end' : 'justify-start'} ${
                  promptStack.highlightId === message.id
                    ? 'rounded-2xl ring-2 ring-cyan-400/70 ring-offset-2 ring-offset-slate-950'
                    : ''
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[80%] sm:text-base ${
                    message.sender === 'user'
                      ? 'bg-cyan-700 text-white'
                      : message.contributionRecord
                        ? 'border border-emerald-700/50 bg-emerald-950/25 text-slate-100'
                        : 'text-slate-100'
                  }`}
                  title={
                    message.sender === 'user' && editingMessageId !== message.id
                      ? formatUserMessageTimestamp(message.timestamp)
                      : undefined
                  }
                >
                  {message.sender === 'assistant' ? (
                    <>
                      {isContributionRecordHint(message.contributionHint) ? (
                        <>
                          <HermesContributionLedger
                            recordHint={message.contributionHint}
                            contributionSets={contributionSets}
                            recordMarkdown={message.text}
                            onRevise={startRevision}
                            onEditDraft={startEditDraft}
                          />
                          <p className="mb-2 inline-flex rounded-full border border-emerald-600/60 bg-emerald-950/50 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-200">
                            {message.contributionHint.mode === 'draft'
                              ? 'Saved to Discuss drafts'
                              : 'Published to Canopi Discuss'}
                          </p>
                        </>
                      ) : null}
                      <HermesMarkdown text={message.text} variant="dark" />
                    </>
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
                    <>
                      <p className="whitespace-pre-wrap">{message.text}</p>
                      {message.pendingSend ? (
                        <div className="mt-2 space-y-1 border-t border-cyan-600/40 pt-2">
                          <p className="text-[11px] text-amber-100/90">
                            {message.sendError || 'Message not saved — Hermes did not receive this turn.'}
                          </p>
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => void retryFailedMessage(message.id)}
                            className="rounded-md bg-white px-2.5 py-1 text-[11px] font-medium text-cyan-800 hover:bg-cyan-50 disabled:opacity-50"
                          >
                            Retry send
                          </button>
                        </div>
                      ) : null}
                    </>
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
                    && message.id !== 'intro'
                    && !isContributionRecordHint(message.contributionHint) ? (
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
                    && isContributionRecordHint(message.contributionHint) ? (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-emerald-800/40 pt-2">
                      <button
                        type="button"
                        onClick={() => void copyAssistantMarkdown(message.id, message.text)}
                        className="rounded-md border border-emerald-700/60 px-2 py-1 text-[11px] text-emerald-100 hover:bg-emerald-950/40"
                      >
                        {copiedMessageId === message.id ? 'Copied' : 'Copy markdown'}
                      </button>
                    </div>
                  ) : null}
                  {message.sender === 'assistant'
                    && shouldShowContributionCTA(message.contributionHint, {
                      sourceTurnId: message.turnId || turnIdFromAssistantMessageId(message.id),
                      contributionSets,
                    }) ? (
                    <HermesContributionCTA
                      hint={message.contributionHint as ContributionHint}
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
                    && !isLoading
                    && !message.contributionRecord ? (
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
              <div ref={contributionPanelRef}>
                <HermesContributionPanel
                  draft={contributionDraft}
                  contributionSets={contributionSets}
                  busy={contributionBusy}
                  onSubmit={submitContribution}
                  onCancel={() => void cancelContributionDraft()}
                  onDraftChange={updateContributionDraft}
                />
              </div>
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
          {!compact ? (
            <HermesPromptStackRail
              items={promptStack.items}
              totalHeight={promptStack.totalHeight}
              activeIndex={promptStack.activeIndex}
              collapsed={promptStack.collapsed}
              onCollapsedChange={promptStack.setCollapsed}
              onJump={promptStack.jumpTo}
            />
          ) : null}
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
