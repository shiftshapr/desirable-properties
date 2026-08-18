'use client';

import type { PromptStackItem } from '@/lib/usePromptStack';
import { useCursorActivityVisibility } from '@/lib/useCursorActivityVisibility';

type HermesPromptStackRailProps = {
  items: PromptStackItem[];
  activeIndex: number;
  onJump: (messageId: string) => void;
};

const BAR_WIDTH_PX = 20;
const BAR_HEIGHT_PX = 2;
const BAR_GAP_PX = 6;

export default function HermesPromptStackRail({
  items,
  activeIndex,
  onJump,
}: HermesPromptStackRailProps) {
  const { visible, targetPointerHandlers } = useCursorActivityVisibility(items.length > 0);

  if (!items.length) return null;

  return (
    <div
      className={`pointer-events-none fixed right-6 top-1/2 z-40 hidden -translate-y-1/2 transition-opacity duration-300 md:flex ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      aria-hidden={!visible}
      {...targetPointerHandlers}
    >
      <div className="pointer-events-auto flex items-center justify-end">
        <div
          className="flex flex-col items-end"
          style={{ gap: BAR_GAP_PX }}
          role="navigation"
          aria-label="Prompt navigator"
        >
          {items.map((item, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={item.messageId}
                type="button"
                onClick={() => onJump(item.messageId)}
                className={`rounded-full transition-colors ${
                  isActive
                    ? 'bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.35)]'
                    : 'bg-slate-600/90 hover:bg-slate-400'
                }`}
                style={{ width: BAR_WIDTH_PX, height: BAR_HEIGHT_PX, minHeight: BAR_HEIGHT_PX }}
                aria-label={`Jump to prompt ${item.index + 1}: ${item.label}`}
                title={item.label}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
