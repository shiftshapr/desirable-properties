'use client';

import type { RefObject } from 'react';
import type { PromptStackItem } from '@/lib/usePromptStack';
import { useCursorActivityVisibility } from '@/lib/useCursorActivityVisibility';

type HermesPromptStackRailProps = {
  items: PromptStackItem[];
  activeIndex: number;
  onJump: (messageId: string) => void;
  activityRootRef?: RefObject<HTMLElement | null>;
};

const TICK_WIDTH_PX = 18;
const TICK_HEIGHT_PX = 1;
const TICK_GAP_PX = 10;

export default function HermesPromptStackRail({
  items,
  activeIndex,
  onJump,
  activityRootRef,
}: HermesPromptStackRailProps) {
  const { visible, targetPointerHandlers } = useCursorActivityVisibility(
    items.length > 0,
    1200,
    activityRootRef,
  );

  if (!items.length) return null;

  return (
    <div
      className={`pointer-events-none fixed right-[1in] top-1/2 z-40 hidden -translate-y-1/2 flex-col items-end transition-opacity duration-300 md:flex ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      role="navigation"
      aria-label="Prompt navigator"
      aria-hidden={!visible}
    >
      <div
        className="pointer-events-auto flex flex-col items-end"
        style={{ gap: TICK_GAP_PX }}
        {...targetPointerHandlers}
      >
        {items.map((item, idx) => {
          const isActive = idx === activeIndex;
          return (
            <button
              key={item.stackKey}
              type="button"
              onClick={() => onJump(item.messageId)}
              className="group flex items-center justify-end py-0.5 pl-3"
              aria-label={`Jump to prompt ${item.index + 1}: ${item.label}`}
              title={item.label}
            >
              <span
                className={`block rounded-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-cyan-400/90 shadow-[0_0_6px_rgba(34,211,238,0.35)]'
                    : 'bg-slate-600/70 group-hover:bg-slate-400/80'
                }`}
                style={{ width: TICK_WIDTH_PX, height: TICK_HEIGHT_PX }}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
