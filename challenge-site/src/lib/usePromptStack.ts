import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type PromptStackMessage = {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  contributionRecord?: boolean;
};

export type PromptStackItem = {
  messageId: string;
  turnId: string | null;
  label: string;
  index: number;
  offsetTop: number;
};

export const PROMPT_STACK_COLLAPSED_KEY = 'hermes:promptStackCollapsed';

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
    if (!message.text.trim()) continue;
    const firstLine = message.text.split('\n')[0].trim();
    const turnId = message.id.endsWith('-u') ? message.id.slice(0, -2) : null;
    items.push({
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

function readCollapsedPreference(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(PROMPT_STACK_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function usePromptStack({
  messages,
  scrollContainerRef,
  messageRefs,
  enabled = true,
}: {
  messages: PromptStackMessage[];
  scrollContainerRef: React.RefObject<HTMLElement | null>;
  messageRefs: React.MutableRefObject<Map<string, HTMLElement>>;
  enabled?: boolean;
}) {
  const [collapsed, setCollapsedState] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [offsetsVersion, setOffsetsVersion] = useState(0);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setCollapsedState(readCollapsedPreference());
  }, []);

  const setCollapsed = useCallback((value: boolean) => {
    setCollapsedState(value);
    try {
      window.localStorage.setItem(PROMPT_STACK_COLLAPSED_KEY, value ? '1' : '0');
    } catch {
      // ignore
    }
  }, []);

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

  const totalHeight = useMemo(() => {
    const container = scrollContainerRef.current;
    return container?.scrollHeight ?? 1;
  }, [scrollContainerRef, offsetsVersion, messages]);

  useEffect(() => {
    if (!enabled) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const bump = () => setOffsetsVersion((v) => v + 1);
    bump();

    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(bump)
      : null;
    ro?.observe(container);
    for (const el of messageRefs.current.values()) {
      if (el) ro?.observe(el);
    }

    const onScroll = () => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
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
  }, [enabled, items, scrollContainerRef, messageRefs, messages]);

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
    totalHeight,
    activeIndex,
    highlightId,
    collapsed,
    setCollapsed,
    jumpTo,
    visible: enabled && items.length > 0,
  };
}
