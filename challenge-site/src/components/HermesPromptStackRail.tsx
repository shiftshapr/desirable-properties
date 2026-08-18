'use client';

import type { PromptStackItem } from '@/lib/usePromptStack';
import { useCursorActivityVisibility } from '@/lib/useCursorActivityVisibility';

type HermesPromptStackRailProps = {
  items: PromptStackItem[];
  totalHeight: number;
  activeIndex: number;
  onJump: (messageId: string) => void;
};

const BAR_WIDTH_PX = 20;
const BAR_HEIGHT_PX = 3;
const BAR_HIT_HEIGHT_PX = 12;

export default function HermesPromptStackRail({
  items,
  totalHeight,
  activeIndex,
  onJump,
}: HermesPromptStackRailProps) {
  const { visible, targetPointerHandlers } = useCursorActivityVisibility(items.length > 0);

  if (!items.length) return null;

  const safeTotal = Math.max(totalHeight, 1);

  return (
    <div
      className="pointer-events-none fixed inset-y-0 right-0 z-40 hidden w-10 md:block"
      aria-hidden={!visible}
    >
      <div
        className={`relative h-full transition-opacity duration-300 ${
          visible ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        {...targetPointerHandlers}
      >
        <div
          className="relative h-full w-full"
          role="navigation"
          aria-label="Prompt navigator"
        >
          {items.map((item, idx) => {
            const isActive = idx === activeIndex;
            const topPct = (item.offsetTop / safeTotal) * 100;
            return (
              <button
                key={item.stackKey}
                type="button"
                onClick={() => onJump(item.messageId)}
                className={`absolute right-3 flex items-center justify-end rounded-full transition-colors ${
                  isActive
                    ? 'bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.35)]'
                    : 'bg-slate-500/90 hover:bg-slate-300'
                }`}
                style={{
                  top: `${Math.min(Math.max(topPct, 1), 99)}%`,
                  width: BAR_WIDTH_PX,
                  height: BAR_HIT_HEIGHT_PX,
                  transform: 'translateY(-50%)',
                }}
                aria-label={`Jump to prompt ${item.index + 1}: ${item.label}`}
                title={item.label}
              >
                <span
                  className="block rounded-full"
                  style={{ width: BAR_WIDTH_PX, height: BAR_HEIGHT_PX }}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
