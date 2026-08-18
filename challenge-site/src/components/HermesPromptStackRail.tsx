'use client';

import type { PromptStackItem } from '@/lib/usePromptStack';

type HermesPromptStackRailProps = {
  items: PromptStackItem[];
  totalHeight: number;
  activeIndex: number;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onJump: (messageId: string) => void;
};

const RAIL_WIDTH_PX = 52;
const BAR_MIN_HEIGHT_PX = 4;

export default function HermesPromptStackRail({
  items,
  totalHeight,
  activeIndex,
  collapsed,
  onCollapsedChange,
  onJump,
}: HermesPromptStackRailProps) {
  if (!items.length) return null;

  const safeTotal = Math.max(totalHeight, 1);

  return (
    <div
      className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden md:flex"
      style={{ width: collapsed ? 12 : RAIL_WIDTH_PX }}
      aria-hidden={collapsed}
    >
      <div
        className={`pointer-events-auto flex h-full flex-col border-l border-slate-800/80 bg-slate-950/85 backdrop-blur-sm ${
          collapsed ? 'w-3' : 'w-full'
        }`}
      >
        <button
          type="button"
          onClick={() => onCollapsedChange(!collapsed)}
          className="shrink-0 border-b border-slate-800/60 px-1 py-1.5 text-[10px] text-slate-500 hover:bg-slate-900 hover:text-slate-300"
          aria-label={collapsed ? 'Expand prompt stack' : 'Collapse prompt stack'}
          title={collapsed ? 'Show prompts' : 'Hide prompts'}
        >
          {collapsed ? '‖' : '‹'}
        </button>

        {!collapsed ? (
          <div className="relative min-h-0 flex-1 px-2 py-2">
            {items.map((item, idx) => {
              const topPct = (item.offsetTop / safeTotal) * 100;
              const nextOffset = idx < items.length - 1
                ? items[idx + 1].offsetTop
                : safeTotal;
              const heightPct = Math.max(
                ((nextOffset - item.offsetTop) / safeTotal) * 100,
                (BAR_MIN_HEIGHT_PX / safeTotal) * 100,
              );
              const isActive = idx === activeIndex;
              return (
                <button
                  key={item.messageId}
                  type="button"
                  onClick={() => onJump(item.messageId)}
                  className={`absolute left-2 right-2 rounded-full transition-colors ${
                    isActive
                      ? 'bg-cyan-500 shadow-[0_0_6px_rgba(34,211,238,0.45)]'
                      : 'bg-slate-700 hover:bg-cyan-600/80'
                  }`}
                  style={{
                    top: `${Math.min(topPct, 98)}%`,
                    height: `${Math.max(heightPct, 0.4)}%`,
                    minHeight: BAR_MIN_HEIGHT_PX,
                  }}
                  aria-label={`Jump to prompt ${item.index + 1}: ${item.label}`}
                  title={item.label}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            {activeIndex >= 0 && items[activeIndex] ? (
              <span
                className="h-2 w-2 rounded-full bg-cyan-500"
                title={items[activeIndex].label}
              />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
