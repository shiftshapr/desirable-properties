'use client';

import type { PromptStackItem } from '@/lib/usePromptStack';
import { useCursorActivityVisibility } from '@/lib/useCursorActivityVisibility';

type HermesPromptStackRailProps = {
  items: PromptStackItem[];
  activeIndex: number;
  onJump: (messageId: string) => void;
};

const TICK_WIDTH_PX = 24;
const TICK_HEIGHT_PX = 2;
const TICK_GAP_PX = 6;

export default function HermesPromptStackRail({
  items,
  activeIndex,
  onJump,
}: HermesPromptStackRailProps) {
  const { visible, targetPointerHandlers } = useCursorActivityVisibility(items.length > 0);

  if (!items.length) return null;

  return (
    <div
      className={`fixed right-6 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center transition-opacity duration-300 md:flex ${
        visible ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
      role="navigation"
      aria-label="Prompt navigator"
      aria-hidden={!visible}
      {...targetPointerHandlers}
    >
      <div className="flex flex-col items-center" style={{ gap: TICK_GAP_PX }}>
        {items.map((item, idx) => {
          const isActive = idx === activeIndex;
          return (
            <button
              key={item.stackKey}
              type="button"
              onClick={() => onJump(item.messageId)}
              className="flex items-center justify-center px-2 py-1.5"
              aria-label={`Jump to prompt ${item.index + 1}: ${item.label}`}
              title={item.label}
            >
              <span
                className={`block rounded-full transition-colors ${
                  isActive
                    ? 'bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.45)]'
                    : 'bg-slate-500/80 hover:bg-slate-300'
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
