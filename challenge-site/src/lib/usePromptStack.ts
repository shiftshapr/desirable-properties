import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { isTextSelectionInElement } from '@/lib/chat-text-selection';

export type PromptStackMessage = {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  contributionRecord?: boolean;
};

export type PromptStackItem = {
  /** Stable React key; unique even if messageId collides. */
  stackKey: string;
  messageId: string;
  turnId: string | null;
  label: string;
  index: number;
  offsetTop: number;
};

/** Derive prompt-stack items from chat messages (pure, testable). */
export function buildPromptStackItems(
  messages: PromptStackMessage[],
  messageOffsets: Map<string, number> = new Map(),
): PromptStackItem[] {
  const items: PromptStackItem[] = [];
  let index = 0;
  for (const message of messages) {
    if (message.sender !== 'user') continue;
    if (message.id === 'intro') continue;
    if (message.contributionRecord) continue;
    const messageText = String(message.text ?? '');
    if (!messageText.trim()) continue;
    const firstLine = messageText.split('\n')[0].trim();
    const turnId = message.id.endsWith('-u') ? message.id.slice(0, -2) : null;
    items.push({
      stackKey: `${message.id}:${index}`,
      messageId: message.id,
      turnId,
      label: firstLine.length > 80 ? `${firstLine.slice(0, 77)}…` : firstLine,
      index,
      offsetTop: messageOffsets.get(message.id) ?? 0,
    });
    index += 1;
  }
  return items;
}

/** Find active prompt index from scroll position (pure, testable). */
export function activePromptIndexFromOffsets(
  items: Pick<PromptStackItem, 'messageId' | 'offsetTop'>[],
  scrollTop: number,
  viewportHeight: number,
): number {
  if (!items.length) return -1;
  const midpoint = scrollTop + viewportHeight * 0.35;
  let active = 0;
  for (let i = 0; i < items.length; i += 1) {
    if (items[i].offsetTop <= midpoint) active = i;
    else break;
  }
  return active;
}

export function usePromptStack({
  messages,
  scrollContainerRef,
  messageRefs,
  enabled = true,
  pauseWhileSelectingRef,
}: {
  messages: PromptStackMessage[];
  scrollContainerRef: React.RefObject<HTMLElement | null>;
  messageRefs: React.MutableRefObject<Map<string, HTMLElement>>;
  enabled?: boolean;
  pauseWhileSelectingRef?: RefObject<boolean>;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [offsetsVersion, setOffsetsVersion] = useState(0);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  const selectionPaused = useCallback(() => {
    if (pauseWhileSelectingRef?.current) return true;
    return isTextSelectionInElement(scrollContainerRef.current);
  }, [pauseWhileSelectingRef, scrollContainerRef]);

  const measureOffsets = useCallback((): Map<string, number> => {
    const container = scrollContainerRef.current;
    const map = new Map<string, number>();
    if (!container) return map;
    const containerTop = container.getBoundingClientRect().top + container.scrollTop;
    for (const [id, el] of messageRefs.current.entries()) {
      if (!el) continue;
      map.set(id, el.getBoundingClientRect().top - containerTop + container.scrollTop);
    }
    return map;
  }, [scrollContainerRef, messageRefs]);

  const messageOffsets = useMemo(() => {
    void offsetsVersion;
    return measureOffsets();
  }, [measureOffsets, offsetsVersion, messages]);

  const items = useMemo(
    () => buildPromptStackItems(messages, messageOffsets),
    [messages, messageOffsets],
  );

  useEffect(() => {
    if (!enabled) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const bump = () => {
      if (selectionPaused()) return;
      setOffsetsVersion((v) => v + 1);
    };
    bump();

    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(bump)
      : null;
    ro?.observe(container);
    for (const el of messageRefs.current.values()) {
      if (el) ro?.observe(el);
    }

    const onScroll = () => {
      if (selectionPaused()) return;
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        if (selectionPaused()) return;
        const next = activePromptIndexFromOffsets(
          items,
          container.scrollTop,
          container.clientHeight,
        );
        if (next >= 0) setActiveIndex(next);
      });
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      container.removeEventListener('scroll', onScroll);
      ro?.disconnect();
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, items, scrollContainerRef, messageRefs, messages, selectionPaused]);

  const jumpTo = useCallback((messageId: string) => {
    const el = messageRefs.current.get(messageId)
      ?? document.getElementById(`hermes-msg-${messageId}`);
    if (!el) return;
    const reducedMotion = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    setHighlightId(messageId);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setHighlightId(null), 2000);
  }, [messageRefs]);

  useEffect(() => () => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
  }, []);

  return {
    items,
    activeIndex,
    highlightId,
    jumpTo,
    visible: enabled && items.length > 0,
  };
}
