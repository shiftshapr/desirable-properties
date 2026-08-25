'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import ComposeFieldAiAssist, {
  type ComposeAiPromptOption,
} from '@/components/compose/ComposeFieldAiAssist';
import HermesExperimentalBadge from '@/components/workgroup/HermesExperimentalBadge';
import AiPromptInfoModal from '@/components/workgroup/AiPromptInfoModal';
import {
  COMPOSE_AI_REFINEMENTS,
  COMPOSE_AI_STRENGTHEN,
  buildComposeAiMessage,
  composeAiInstruction,
  fetchComposeAiResponse,
} from '@/lib/compose-ai-prompts';
import { getAiPromptInfo } from '@/lib/ai-prompt-info';
import { isDpDiscoveryWorkgroup } from '@/lib/govhub';
import { HERMES_MODE_LABELS, type HermesAmbientMode } from '@/lib/hermes-ambient-types';
import {
  WORKGROUP_ASK_HERMES_INSTRUCTIONS,
  WORKGROUP_ASK_HERMES_PROMPTS,
  WORKGROUP_ASSIST_INSTRUCTION_OVERRIDES,
  buildAskHermesMessage,
  workgroupAssistPromptOptions,
} from '@/lib/workgroup-ai-prompts';
import type { WorkgroupAskNote } from '@/lib/workgroup-hermes-panel-types';
import type { WorkgroupMessage } from '@/lib/workgroup-collab-types';

type AiTab = 'assist' | 'ask';

type Props = {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onValueChange: (next: string) => void;
  workgroupSlug: string;
  workgroupName: string;
  dpId: string | null;
  recentMessages: WorkgroupMessage[];
  disabled?: boolean;
  onSendAsMessage?: (text: string) => void;
  onHermesReply?: (note: WorkgroupAskNote) => void;
  onOpenHermesInstructions?: () => void;
};

function dpFocusFromId(dpId: string | null): number | null {
  const match = String(dpId || '').match(/^DP(\d+)$/i);
  return match ? Number(match[1]) : null;
}

function formatChatContext(messages: WorkgroupMessage[], workgroupName: string): string {
  const recent = messages.slice(-8);
  if (!recent.length) {
    return `Workgroup: ${workgroupName}\nNo messages yet.`;
  }
  const transcript = recent
    .map((msg) => {
      const author = msg.author_name?.trim() || 'Member';
      return `${author}: ${msg.body.trim()}`;
    })
    .join('\n');
  return [`Workgroup: ${workgroupName}`, 'Recent chat:', transcript].join('\n');
}

function latestThreadMessage(messages: WorkgroupMessage[]): string {
  const last = messages[messages.length - 1];
  if (!last) return '';
  const author = last.author_name?.trim() || 'Member';
  return `${author}: ${last.body.trim()}`;
}

const HERMES_MODES: HermesAmbientMode[] = ['observer', 'facilitator', 'devils_advocate'];

export default function WorkgroupChatAiAssist({
  textareaRef,
  value,
  onValueChange,
  workgroupSlug,
  workgroupName,
  dpId,
  recentMessages,
  disabled,
  onSendAsMessage,
  onHermesReply,
  onOpenHermesInstructions,
}: Props) {
  const menuId = useId();
  const isDiscovery = isDpDiscoveryWorkgroup(workgroupSlug);
  const surface = `desirableproperties.org/workgroups/${workgroupSlug}`;
  const dpFocus = dpFocusFromId(dpId);

  const [focused, setFocused] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<AiTab>('assist');

  // Ask Hermes state
  const [askMode, setAskMode] = useState<HermesAmbientMode>('observer');
  const [askQuestion, setAskQuestion] = useState('');
  const [askGenerating, setAskGenerating] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const [pendingAskOption, setPendingAskOption] = useState<ComposeAiPromptOption | null>(null);
  const [askPromptInfoOpen, setAskPromptInfoOpen] = useState(false);
  const askAbortRef = useRef<AbortController | null>(null);
  const typingTimerRef = useRef<number | null>(null);

  const assistPromptOptions = useMemo(
    () => workgroupAssistPromptOptions({ isDiscovery, dpId }),
    [isDiscovery, dpId],
  );

  const contextBlock = useMemo(
    () => formatChatContext(recentMessages, workgroupName),
    [recentMessages, workgroupName],
  );

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    const onFocus = () => setFocused(true);
    const onBlur = () => {
      window.setTimeout(() => {
        if (!panelOpen) setFocused(false);
      }, 120);
    };
    const onInput = () => {
      setTyping(true);
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = window.setTimeout(() => setTyping(false), 1400);
    };

    el.addEventListener('focus', onFocus);
    el.addEventListener('blur', onBlur);
    el.addEventListener('input', onInput);
    return () => {
      el.removeEventListener('focus', onFocus);
      el.removeEventListener('blur', onBlur);
      el.removeEventListener('input', onInput);
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    };
  }, [textareaRef, panelOpen]);

  useEffect(() => {
    if (!panelOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !askGenerating) closePanel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [panelOpen, askGenerating]);

  const closePanel = useCallback(() => {
    askAbortRef.current?.abort();
    setPanelOpen(false);
    setAskError(null);
    setAskGenerating(false);
    setFocused(Boolean(textareaRef.current?.matches(':focus')));
  }, [textareaRef]);

  function openPanel(tab: AiTab = 'assist') {
    if (disabled) return;
    setActiveTab(tab);
    setAskError(null);
    setPanelOpen(true);
  }

  function openInstructions() {
    onOpenHermesInstructions?.();
  }

  const promptInfoContext = useMemo(
    () => ({ dpId, isDiscovery }),
    [dpId, isDiscovery],
  );

  async function generateAssist(
    option: ComposeAiPromptOption,
    context: { draft: string; selection: string },
    signal: AbortSignal,
  ): Promise<string> {
    const userDraft = context.selection.trim() || context.draft.trim();
    const instruction = composeAiInstruction(option, WORKGROUP_ASSIST_INSTRUCTION_OVERRIDES);
    const message = buildComposeAiMessage({
      contextLines: [contextBlock],
      userDraft,
      instruction,
    });
    return fetchComposeAiResponse({
      message,
      surface,
      dpFocus,
      skipMemoryRecord: true,
      signal,
    });
  }

  function handleAskPromptClick(option: ComposeAiPromptOption) {
    const info = getAiPromptInfo(option, promptInfoContext);
    if (info) {
      setPendingAskOption(option);
      setAskPromptInfoOpen(true);
      return;
    }
    void runAskHermes(option);
  }

  async function runAskHermes(option: ComposeAiPromptOption) {
    if (disabled || askGenerating) return;

    askAbortRef.current?.abort();
    const controller = new AbortController();
    askAbortRef.current = controller;

    setAskGenerating(true);
    setAskError(null);

    const threadContext = value.trim()
      ? `Composer draft:\n${value.trim()}`
      : latestThreadMessage(recentMessages)
        ? `Latest thread message:\n${latestThreadMessage(recentMessages)}`
        : contextBlock;

    const instruction =
      WORKGROUP_ASK_HERMES_INSTRUCTIONS[option.id] ?? option.label;

    const message = buildAskHermesMessage({
      instruction,
      mode: askMode,
      contextBlock: threadContext,
      userQuestion: askQuestion,
    });

    try {
      const reply = await fetchComposeAiResponse({
        message,
        surface,
        dpFocus,
        skipMemoryRecord: true,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;

      const note: WorkgroupAskNote = {
        id: `ask-${Date.now()}`,
        mode: askMode,
        reply: reply || '',
        promptLabel: option.label,
        shared: false,
        createdAt: new Date().toISOString(),
      };

      onHermesReply?.(note);
      closePanel();
    } catch (err) {
      if (controller.signal.aborted) return;
      setAskError(err instanceof Error ? err.message : 'AI request failed');
    } finally {
      if (!controller.signal.aborted) setAskGenerating(false);
    }
  }

  const showFab = (focused || panelOpen) && !disabled;
  const fabFaded = typing && !panelOpen;

  return (
    <>
      <AiPromptInfoModal
        open={askPromptInfoOpen}
        info={pendingAskOption ? getAiPromptInfo(pendingAskOption, promptInfoContext) : null}
        onCancel={() => {
          setAskPromptInfoOpen(false);
          setPendingAskOption(null);
        }}
        onContinue={() => {
          const opt = pendingAskOption;
          setAskPromptInfoOpen(false);
          setPendingAskOption(null);
          if (opt) void runAskHermes(opt);
        }}
      />
      <button
        type="button"
        aria-label="AI assist for workgroup message"
        aria-expanded={panelOpen}
        aria-controls={menuId}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => (panelOpen ? closePanel() : openPanel('assist'))}
        className={`absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 rounded-full border border-cyan-600/55 bg-slate-900/95 px-2.5 py-1 text-xs font-bold text-cyan-300 shadow-md transition-all duration-300 ${
          showFab
            ? fabFaded
              ? 'pointer-events-auto translate-y-0 opacity-25'
              : 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-1 opacity-0'
        }`}
        disabled={disabled}
      >
        <span aria-hidden="true">✦</span> AI
      </button>

      {panelOpen ? (
        <div
          className="fixed inset-0 z-[12100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !askGenerating) closePanel();
          }}
        >
          <div
            id={menuId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${menuId}-title`}
            className="max-h-[min(90vh,680px)] w-full max-w-lg overflow-auto rounded-xl border border-slate-700 bg-slate-900 p-4 text-slate-100 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id={`${menuId}-title`} className="text-base font-semibold text-white">
                  AI
                </h2>
                <HermesExperimentalBadge />
                <button
                  type="button"
                  onClick={openInstructions}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-600 text-xs font-bold text-slate-300 hover:border-slate-500 hover:text-white"
                  aria-label="How Deepi works"
                  title="How Deepi works"
                >
                  ?
                </button>
              </div>
              <button
                type="button"
                aria-label="Close AI"
                onClick={() => !askGenerating && closePanel()}
                className="text-xl leading-none text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="mb-4 flex gap-1 rounded-lg border border-slate-800 bg-slate-950/60 p-1">
              <button
                type="button"
                onClick={() => setActiveTab('assist')}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'assist'
                    ? 'bg-cyan-900/60 text-cyan-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Draft my message
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ask')}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'ask'
                    ? 'bg-violet-900/60 text-violet-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Ask Deepi
              </button>
            </div>

            {activeTab === 'assist' ? (
              <AssistTabContent
                textareaRef={textareaRef}
                value={value}
                onValueChange={onValueChange}
                disabled={disabled}
                promptOptions={assistPromptOptions}
                promptInfoContext={promptInfoContext}
                onGenerate={generateAssist}
                onSendAsMessage={onSendAsMessage}
                onClose={closePanel}
              />
            ) : (
              <div>
                <p className="mb-3 text-sm text-slate-400">
                  Deepi replies in your private panel. Nothing posts until you choose.
                </p>

                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Mode
                </p>
                <div className="mb-4 flex flex-wrap gap-2">
                  {HERMES_MODES.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setAskMode(mode)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                        askMode === mode
                          ? 'border-violet-600 bg-violet-900/50 text-violet-100'
                          : 'border-slate-700 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {HERMES_MODE_LABELS[mode]}
                    </button>
                  ))}
                </div>

                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Optional question
                </label>
                <textarea
                  value={askQuestion}
                  onChange={(e) => setAskQuestion(e.target.value)}
                  rows={2}
                  placeholder="Paste context or ask a specific question…"
                  className="mb-4 w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-violet-600 focus:outline-none"
                  disabled={askGenerating}
                />

                <p className="mb-2 text-xs text-slate-500">
                  Context: {value.trim() ? 'composer draft' : recentMessages.length ? 'latest thread message' : 'workgroup'}
                </p>

                <div className="flex flex-wrap gap-2">
                  {WORKGROUP_ASK_HERMES_PROMPTS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      disabled={askGenerating}
                      onClick={() => handleAskPromptClick(option)}
                      className="rounded-full border border-slate-700 bg-violet-950/30 px-3 py-1.5 text-xs font-semibold text-violet-200 hover:border-violet-700 hover:bg-violet-950/50 disabled:opacity-50"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {askGenerating ? (
                  <p className="mt-4 text-sm text-amber-200" aria-live="polite">
                    Deepi is thinking…
                  </p>
                ) : null}

                {askError ? <p className="mt-4 text-sm text-rose-300">{askError}</p> : null}

                {askGenerating ? (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        askAbortRef.current?.abort();
                        setAskGenerating(false);
                      }}
                      className="rounded-lg border border-rose-800/60 px-3 py-1.5 text-sm text-rose-200 hover:border-rose-600"
                    >
                      Stop
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Embedded assist flow — reuses ComposeFieldAiAssist in embedded mode. */
function AssistTabContent({
  textareaRef,
  value,
  onValueChange,
  disabled,
  promptOptions,
  promptInfoContext,
  onGenerate,
  onSendAsMessage,
  onClose,
}: {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onValueChange: (next: string) => void;
  disabled?: boolean;
  promptOptions: ComposeAiPromptOption[];
  promptInfoContext?: { dpId?: string | null; isDiscovery?: boolean };
  onGenerate: (
    option: ComposeAiPromptOption,
    context: { draft: string; selection: string },
    signal: AbortSignal,
  ) => Promise<string>;
  onSendAsMessage?: (text: string) => void;
  onClose: () => void;
}) {
  return (
    <ComposeFieldAiAssist
      textareaRef={textareaRef}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      mode="chatReply"
      embedded
      defaultOpen
      onEmbeddedClose={onClose}
      onSendResponse={
        onSendAsMessage
          ? (text) => {
              onSendAsMessage(text);
              onClose();
            }
          : undefined
      }
      promptOptions={promptOptions}
      promptInfoContext={promptInfoContext}
      refinementOptions={[...COMPOSE_AI_REFINEMENTS, COMPOSE_AI_STRENGTHEN]}
      onGenerate={onGenerate}
      fieldLabel="workgroup message"
    />
  );
}
