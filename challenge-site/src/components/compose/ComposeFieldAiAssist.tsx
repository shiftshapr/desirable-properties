'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type RefObject,
} from 'react';
import HermesMarkdown from '@/components/HermesMarkdown';
import { COMPOSE_AI_REFINEMENTS } from '@/lib/compose-ai-prompts';
import { markdownToPlainText } from '@/lib/markdown-to-plain-text';

export type ComposeAiPromptOption = {
  id: string;
  label: string;
  /** When false, chip works on an empty field (e.g. Help me get started). Default true. */
  requiresDraft?: boolean;
};

type GenerateContext = {
  draft: string;
  selection: string;
  selectionStart: number;
  selectionEnd: number;
};

const COMPOSE_AI_MAX_CHARS = 1000;

function capComposeAiText(text: string, max = COMPOSE_AI_MAX_CHARS): string {
  const t = text.trim();
  if (t.length <= max) return t;

  const slice = t.slice(0, max);
  const sentenceRe = /[.!?]["')]*(?:\s+|$)/g;
  let lastSentenceEnd = -1;
  let match: RegExpExecArray | null;
  while ((match = sentenceRe.exec(slice)) !== null) {
    lastSentenceEnd = match.index + match[0].trimEnd().length;
  }
  if (lastSentenceEnd > 0) return t.slice(0, lastSentenceEnd).trim();

  const lastSpace = slice.lastIndexOf(' ');
  if (lastSpace > 0) return t.slice(0, lastSpace).trim();
  return slice.trim();
}

export type ComposeAiAssistMode = 'compose' | 'chatReply';

type Props = {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onValueChange: (next: string) => void;
  disabled?: boolean;
  promptOptions: ComposeAiPromptOption[];
  /** Shown after generation to refine the preview (Expand, Clarify, etc.). */
  refinementOptions?: ComposeAiPromptOption[];
  onGenerate: (
    option: ComposeAiPromptOption,
    context: GenerateContext,
    signal: AbortSignal,
  ) => Promise<string>;
  fieldLabel?: string;
  onAiApplied?: () => void;
  /** compose = Insert/Replace into a field; chatReply = user message in chat (not Hermes). */
  mode?: ComposeAiAssistMode;
  /** When mode is chatReply, send the draft as the user's chat message. */
  onSendResponse?: (text: string) => void;
};

function getSelection(textarea: HTMLTextAreaElement | null, fallbackValue: string): GenerateContext {
  if (!textarea) {
    return { draft: fallbackValue, selection: '', selectionStart: 0, selectionEnd: 0 };
  }
  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? 0;
  const draft = textarea.value || fallbackValue;
  return {
    draft,
    selection: draft.slice(start, end),
    selectionStart: start,
    selectionEnd: end,
  };
}

export default function ComposeFieldAiAssist({
  textareaRef,
  value,
  onValueChange,
  disabled,
  promptOptions,
  refinementOptions = COMPOSE_AI_REFINEMENTS,
  onGenerate,
  fieldLabel = 'Message',
  onAiApplied,
  mode = 'compose',
  onSendResponse,
}: Props) {
  const menuId = useId();
  const [focused, setFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastOption, setLastOption] = useState<ComposeAiPromptOption | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const panelOpen = menuOpen || Boolean(preview) || generating || Boolean(error);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    const onFocus = () => setFocused(true);
    const onBlur = () => {
      window.setTimeout(() => {
        if (!menuOpen && !preview && !generating && !error) setFocused(false);
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
  }, [textareaRef, menuOpen, preview, generating, error]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!panelOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !generating) closePanel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [panelOpen, generating]);

  const closePanel = useCallback(() => {
    if (generating) abortRef.current?.abort();
    setMenuOpen(false);
    setPreview('');
    setError(null);
    setGenerating(false);
    setLastOption(null);
    setFocused(Boolean(textareaRef.current?.matches(':focus')));
  }, [generating, textareaRef]);

  function openMenu() {
    if (disabled) return;
    setPreview('');
    setError(null);
    setMenuOpen(true);
  }

  async function runRefine(option: ComposeAiPromptOption) {
    if (disabled || generating || !preview.trim()) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLastOption(option);
    setGenerating(true);
    setError(null);

    const context = {
      draft: preview,
      selection: '',
      selectionStart: 0,
      selectionEnd: 0,
    };

    try {
      const result = await onGenerate(option, context, controller.signal);
      if (controller.signal.aborted) return;
      setPreview(capComposeAiText(result || ''));
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : 'AI request failed');
    } finally {
      if (!controller.signal.aborted) setGenerating(false);
    }
  }

  async function runGenerate(option: ComposeAiPromptOption, regenerate = false) {
    if (disabled || generating) return;
    const context = getSelection(textareaRef.current, value);
    const needsDraft = option.requiresDraft !== false;
    if (!regenerate && needsDraft && !context.draft.trim() && !context.selection.trim()) {
      setError('Type or select text in the field first.');
      setMenuOpen(true);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLastOption(option);
    setMenuOpen(false);
    setGenerating(true);
    setError(null);
    setPreview('');

    try {
      const result = await onGenerate(option, context, controller.signal);
      if (controller.signal.aborted) return;
      setPreview(capComposeAiText(result || ''));
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : 'AI request failed');
    } finally {
      if (!controller.signal.aborted) setGenerating(false);
    }
  }

  function sendAsResponse() {
    const draft = markdownToPlainText(capComposeAiText(preview));
    if (!draft) return;
    if (onSendResponse) {
      onSendResponse(draft);
      onAiApplied?.();
      closePanel();
      return;
    }
    applyDraft('replace');
  }

  function applyDraft(mode: 'insert' | 'replace') {
    const draft = markdownToPlainText(capComposeAiText(preview));
    if (!draft) return;
    const textarea = textareaRef.current;
    const full = value;
    const sel = getSelection(textarea, full);

    let next = full;
    let cursor = full.length;

    if (mode === 'replace' && sel.selection.trim()) {
      next = full.slice(0, sel.selectionStart) + draft + full.slice(sel.selectionEnd);
      cursor = sel.selectionStart + draft.length;
    } else if (textarea && textarea.selectionStart === textarea.selectionEnd) {
      const pos = textarea.selectionStart ?? full.length;
      next = full.slice(0, pos) + draft + full.slice(pos);
      cursor = pos + draft.length;
    } else if (mode === 'replace') {
      next = draft;
      cursor = draft.length;
    } else {
      const pos = textarea?.selectionStart ?? full.length;
      next = full.slice(0, pos) + draft + full.slice(pos);
      cursor = pos + draft.length;
    }

    onValueChange(next);
    onAiApplied?.();
    closePanel();
    requestAnimationFrame(() => {
      textarea?.focus();
      if (textarea && typeof textarea.setSelectionRange === 'function') {
        textarea.setSelectionRange(cursor, cursor);
      }
    });
  }

  function handleStop() {
    abortRef.current?.abort();
    setGenerating(false);
  }

  const showFab = (focused || panelOpen) && !disabled;
  const fabFaded = typing && !panelOpen;

  return (
    <>
      <button
        type="button"
        aria-label={`AI assist for ${fieldLabel}`}
        aria-expanded={panelOpen}
        aria-controls={menuId}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => (panelOpen && !menuOpen ? closePanel() : openMenu())}
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
            if (e.target === e.currentTarget && !generating) closePanel();
          }}
        >
          <div
            id={menuId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${menuId}-title`}
            className="max-h-[min(90vh,640px)] w-full max-w-lg overflow-auto rounded-xl border border-slate-700 bg-slate-900 p-4 text-slate-100 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 id={`${menuId}-title`} className="text-base font-semibold text-white">
                AI Assist
              </h2>
              <button
                type="button"
                aria-label="Close AI assist"
                onClick={() => !generating && closePanel()}
                className="text-xl leading-none text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>

            {menuOpen ? (
              <>
                <p className="mb-3 text-sm text-slate-400">
                  {mode === 'chatReply'
                    ? 'Draft a reply you can send as your own message (not from Hermes).'
                    : `Choose a suggestion to draft text for your ${fieldLabel.toLowerCase()}.`}
                </p>
                <div className="flex flex-wrap gap-2">
                  {promptOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      disabled={generating}
                      onClick={() => void runGenerate(option)}
                      className="rounded-full border border-slate-700 bg-cyan-950/30 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:border-cyan-700 hover:bg-cyan-950/50 disabled:opacity-50"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            {generating ? (
              <p className="mt-4 text-sm text-amber-200" aria-live="polite">
                Generating…
              </p>
            ) : null}

            {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

            {preview ? (
              <div
                className={`mt-4 rounded-lg border p-3 ${
                  mode === 'chatReply'
                    ? 'border-cyan-700/50 bg-cyan-950/20'
                    : 'border-slate-700 bg-slate-950/60'
                }`}
              >
                <p className="text-xs font-medium uppercase tracking-wide text-cyan-400/80">
                  {mode === 'chatReply' ? 'Your draft reply' : 'Generated text'}
                </p>
                {mode === 'chatReply' ? (
                  <p className="mt-1 text-xs text-slate-400">
                    This will be sent as your message, not from Hermes.
                  </p>
                ) : null}
                <div className="mt-2 max-h-48 overflow-auto text-sm leading-relaxed">
                  <HermesMarkdown text={preview} variant="dark" />
                </div>
                {refinementOptions.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {refinementOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        disabled={generating}
                        onClick={() => void runRefine(option)}
                        className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs font-semibold text-slate-200 hover:border-cyan-700 hover:text-cyan-100 disabled:opacity-50"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {mode === 'chatReply' ? (
                    <>
                      <button
                        type="button"
                        onClick={sendAsResponse}
                        className="rounded-lg border border-cyan-700 bg-cyan-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-600"
                      >
                        {onSendResponse ? 'Send as response' : 'Use as my message'}
                      </button>
                      <button
                        type="button"
                        onClick={() => applyDraft('replace')}
                        className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-400"
                      >
                        Edit in composer
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => applyDraft('insert')}
                        className="rounded-lg border border-cyan-700 bg-cyan-950/40 px-3 py-1.5 text-sm font-medium text-cyan-100 hover:bg-cyan-900/40"
                      >
                        Insert
                      </button>
                      <button
                        type="button"
                        onClick={() => applyDraft('replace')}
                        className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-400"
                      >
                        Replace
                      </button>
                    </>
                  )}
                  {lastOption ? (
                    <button
                      type="button"
                      onClick={() => void runGenerate(lastOption, true)}
                      className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-400"
                    >
                      Regenerate
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {generating ? (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleStop}
                  className="rounded-lg border border-rose-800/60 px-3 py-1.5 text-sm text-rose-200 hover:border-rose-600"
                >
                  Stop
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
