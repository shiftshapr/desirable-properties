'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AstraChangeDetail from '@/components/workgroup/AstraChangeDetail';
import type { AstraChange } from '@/lib/astra-types';
import {
  ASTRA_DWELL_MS,
  ASTRA_OPERATION_LABELS,
  ASTRA_OPERATION_STYLES,
} from '@/lib/astra-types';
import { buildAstraHighlightSegments, groupAstraSegmentsForRender } from '@/lib/astra-highlights';
import { sanitizeAstraMarkdown } from '@/lib/astra-display';
import { useAstraMarkdownComponents } from '@/components/astra/AstraMarkdown';

type Props = {
  markdown: string;
  changes: AstraChange[];
  pinnedChangeId: string | null;
  previewChangeId: string | null;
  onPinChange: (changeId: string | null) => void;
  onPreviewChange: (changeId: string | null) => void;
  pulseChangeId?: string | null;
  workgroupId?: string | null;
  applauseTotals?: Record<string, number>;
  applauseMine?: Record<string, number>;
  onApplauseUpdate?: (changeId: string, next: { total: number; mine: number }) => void;
};

function useIsCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const update = () => setCoarse(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return coarse;
}

function useMarkdownComponents(): Record<string, unknown> {
  return useAstraMarkdownComponents();
}

function MarkdownBlock({ text }: { text: string }) {
  const components = useMarkdownComponents();
  if (!text.trim()) return null;
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {text}
    </ReactMarkdown>
  );
}

function InlineMarkdown({ text }: { text: string }) {
  const components = useMarkdownComponents();
  if (!text) return null;
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        ...components,
        p: ({ children }: { children?: ReactNode }) => <>{children}</>,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

function InlineHighlightSpan({
  change,
  text,
  pinned,
  preview,
  pulsing,
  coarsePointer,
  onPin,
  onPreview,
}: {
  change: AstraChange;
  text: string;
  pinned: boolean;
  preview: boolean;
  pulsing: boolean;
  coarsePointer: boolean;
  onPin: (changeId: string) => void;
  onPreview: (changeId: string | null) => void;
}) {
  const dwellTimer = useRef<number | null>(null);
  const components = useMarkdownComponents();

  const clearDwell = useCallback(() => {
    if (dwellTimer.current !== null) {
      window.clearTimeout(dwellTimer.current);
      dwellTimer.current = null;
    }
  }, []);

  useEffect(() => () => clearDwell(), [clearDwell]);

  const style = ASTRA_OPERATION_STYLES[change.operation] || ASTRA_OPERATION_STYLES.revise;
  const activeOutline = pinned || preview ? ' outline outline-2 outline-cyan-300/80 outline-offset-2' : '';
  const pulseClass = pulsing ? ' animate-pulse' : '';

  return (
    <span
      data-astra-change-id={change.id}
      role="button"
      aria-expanded={pinned}
      aria-label={`Astra ${ASTRA_OPERATION_LABELS[change.operation]}: ${change.rationale.slice(0, 80)}`}
      className={`cursor-pointer rounded px-0.5 transition-colors${style}${activeOutline}${pulseClass}`}
      onMouseDown={(event) => event.preventDefault()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onPin(change.id);
      }}
      onMouseEnter={() => {
        if (coarsePointer || pinned) return;
        clearDwell();
        dwellTimer.current = window.setTimeout(() => onPreview(change.id), ASTRA_DWELL_MS);
      }}
      onMouseLeave={() => {
        if (coarsePointer || pinned) return;
        clearDwell();
        onPreview(null);
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          ...components,
          p: ({ children }: { children?: ReactNode }) => <>{children}</>,
        }}
      >
        {text}
      </ReactMarkdown>
    </span>
  );
}

function InlineSegmentGroup({
  segments,
  pinnedChangeId,
  previewChangeId,
  pulseChangeId,
  coarsePointer,
  onPinChange,
  onPreviewChange,
  onClose,
  markdown,
  workgroupId,
  applauseTotals,
  applauseMine,
  onApplauseUpdate,
}: {
  segments: Array<{ kind: 'plain' | 'highlight'; text: string; change?: AstraChange }>;
  pinnedChangeId: string | null;
  previewChangeId: string | null;
  pulseChangeId: string | null;
  coarsePointer: boolean;
  onPinChange: (changeId: string | null) => void;
  onPreviewChange: (changeId: string | null) => void;
  onClose: () => void;
  markdown: string;
  workgroupId?: string | null;
  applauseTotals?: Record<string, number>;
  applauseMine?: Record<string, number>;
  onApplauseUpdate?: (changeId: string, next: { total: number; mine: number }) => void;
}) {
  const pinnedChange = segments.find(
    (segment) => segment.change && pinnedChangeId === segment.change.id,
  )?.change;
  const previewChange = segments.find(
    (segment) => segment.change && previewChangeId === segment.change.id,
  )?.change;

  return (
    <div className="mb-3 text-sm leading-relaxed text-slate-300">
      {segments.map((segment, index) => {
        if (segment.kind === 'plain') {
          return <InlineMarkdown key={`plain-${index}`} text={segment.text} />;
        }
        if (!segment.change) return null;
        const change = segment.change;
        return (
          <InlineHighlightSpan
            key={change.id}
            change={change}
            text={segment.text}
            pinned={pinnedChangeId === change.id}
            preview={previewChangeId === change.id && pinnedChangeId !== change.id}
            pulsing={pulseChangeId === change.id}
            coarsePointer={coarsePointer}
            onPin={(changeId) => onPinChange(pinnedChangeId === changeId ? null : changeId)}
            onPreview={onPreviewChange}
          />
        );
      })}
      {pinnedChange ? (
        <div className="mb-5 mt-2 rounded-xl border border-cyan-800/50 bg-slate-950/95 p-4 shadow-lg">
          <AstraChangeDetail
            change={pinnedChange}
            onClose={onClose}
            markdown={markdown}
            workgroupId={workgroupId}
            applauseTotal={applauseTotals?.[pinnedChange.id] ?? 0}
            applauseMine={applauseMine?.[pinnedChange.id] ?? 0}
            onApplauseUpdate={
              onApplauseUpdate
                ? (next) => onApplauseUpdate(pinnedChange.id, next)
                : undefined
            }
          />
        </div>
      ) : null}
      {previewChange && !pinnedChange ? (
        <div className="mb-3 mt-2">
          <AstraDwellPreview change={previewChange} visible />
        </div>
      ) : null}
    </div>
  );
}

function InlineChangePanel({
  change,
  pinned,
  preview,
  onClose,
  markdown,
  workgroupId,
  applauseTotal,
  applauseMine,
  onApplauseUpdate,
}: {
  change: AstraChange;
  pinned: boolean;
  preview: boolean;
  onClose: () => void;
  markdown: string;
  workgroupId?: string | null;
  applauseTotal?: number;
  applauseMine?: number;
  onApplauseUpdate?: (next: { total: number; mine: number }) => void;
}) {
  if (pinned) {
    return (
      <div className="mb-5 mt-2 rounded-xl border border-cyan-800/50 bg-slate-950/95 p-4 shadow-lg">
        <AstraChangeDetail
          change={change}
          onClose={onClose}
          markdown={markdown}
          workgroupId={workgroupId}
          applauseTotal={applauseTotal}
          applauseMine={applauseMine}
          onApplauseUpdate={onApplauseUpdate}
        />
      </div>
    );
  }

  if (preview) {
    return (
      <div className="mb-3 mt-2">
        <AstraDwellPreview change={change} visible />
      </div>
    );
  }

  return null;
}

function HighlightBlock({
  change,
  text,
  pinned,
  preview,
  pulsing,
  coarsePointer,
  onPin,
  onPreview,
  onClose,
  markdown,
  workgroupId,
  applauseTotal,
  applauseMine,
  onApplauseUpdate,
}: {
  change: AstraChange;
  text: string;
  pinned: boolean;
  preview: boolean;
  pulsing: boolean;
  coarsePointer: boolean;
  onPin: (changeId: string) => void;
  onPreview: (changeId: string | null) => void;
  onClose: () => void;
  markdown: string;
  workgroupId?: string | null;
  applauseTotal?: number;
  applauseMine?: number;
  onApplauseUpdate?: (next: { total: number; mine: number }) => void;
}) {
  const dwellTimer = useRef<number | null>(null);
  const components = useMarkdownComponents();

  const clearDwell = useCallback(() => {
    if (dwellTimer.current !== null) {
      window.clearTimeout(dwellTimer.current);
      dwellTimer.current = null;
    }
  }, []);

  useEffect(() => () => clearDwell(), [clearDwell]);

  const style = ASTRA_OPERATION_STYLES[change.operation] || ASTRA_OPERATION_STYLES.revise;
  const activeOutline = pinned || preview ? ' outline outline-2 outline-cyan-300/80 outline-offset-2' : '';
  const pulseClass = pulsing ? ' animate-pulse' : '';

  return (
    <div className="my-3">
      <div
        data-astra-change-id={change.id}
        role="button"
        aria-expanded={pinned}
        aria-label={`Astra ${ASTRA_OPERATION_LABELS[change.operation]}: ${change.rationale.slice(0, 80)}`}
        className={`cursor-pointer rounded-lg px-2 py-1 transition-colors${style}${activeOutline}${pulseClass}`}
        onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onPin(change.id);
        }}
        onMouseEnter={() => {
          if (coarsePointer || pinned) return;
          clearDwell();
          dwellTimer.current = window.setTimeout(() => onPreview(change.id), ASTRA_DWELL_MS);
        }}
        onMouseLeave={() => {
          if (coarsePointer || pinned) return;
          clearDwell();
          onPreview(null);
        }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {text}
        </ReactMarkdown>
      </div>
      <InlineChangePanel
        change={change}
        pinned={pinned}
        preview={preview}
        onClose={onClose}
        markdown={markdown}
        workgroupId={workgroupId}
        applauseTotal={applauseTotal}
        applauseMine={applauseMine}
        onApplauseUpdate={onApplauseUpdate}
      />
    </div>
  );
}

function DeletionMarker({
  change,
  pinned,
  preview,
  pulsing,
  coarsePointer,
  onPin,
  onPreview,
  onClose,
  markdown,
  workgroupId,
  applauseTotal,
  applauseMine,
  onApplauseUpdate,
}: {
  change: AstraChange;
  pinned: boolean;
  preview: boolean;
  pulsing: boolean;
  coarsePointer: boolean;
  onPin: (changeId: string) => void;
  onPreview: (changeId: string | null) => void;
  onClose: () => void;
  markdown: string;
  workgroupId?: string | null;
  applauseTotal?: number;
  applauseMine?: number;
  onApplauseUpdate?: (next: { total: number; mine: number }) => void;
}) {
  const dwellTimer = useRef<number | null>(null);

  const clearDwell = useCallback(() => {
    if (dwellTimer.current !== null) {
      window.clearTimeout(dwellTimer.current);
      dwellTimer.current = null;
    }
  }, []);

  useEffect(() => () => clearDwell(), [clearDwell]);

  const activeOutline = pinned || preview ? ' outline outline-2 outline-cyan-300/80 outline-offset-2' : '';
  const pulseClass = pulsing ? ' animate-pulse' : '';

  return (
    <div className="my-2">
      <button
        type="button"
        data-astra-change-id={change.id}
        aria-expanded={pinned}
        className={`mx-0.5 inline-flex items-center rounded border border-dashed border-rose-400/80 bg-rose-950/40 px-1.5 py-0.5 text-[11px] font-medium text-rose-200 transition hover:bg-rose-900/50${activeOutline}${pulseClass}`}
        aria-label={`Removed passage: ${change.beforeText.slice(0, 80)}`}
        onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => {
          event.preventDefault();
          onPin(change.id);
        }}
        onMouseEnter={() => {
          if (coarsePointer || pinned) return;
          clearDwell();
          dwellTimer.current = window.setTimeout(() => onPreview(change.id), ASTRA_DWELL_MS);
        }}
        onMouseLeave={() => {
          if (coarsePointer || pinned) return;
          clearDwell();
          onPreview(null);
        }}
      >
        Removed
      </button>
      <InlineChangePanel
        change={change}
        pinned={pinned}
        preview={preview}
        onClose={onClose}
        markdown={markdown}
        workgroupId={workgroupId}
        applauseTotal={applauseTotal}
        applauseMine={applauseMine}
        onApplauseUpdate={onApplauseUpdate}
      />
    </div>
  );
}

export default function AstraChapterReader({
  markdown,
  changes,
  pinnedChangeId,
  previewChangeId,
  onPinChange,
  onPreviewChange,
  pulseChangeId = null,
  workgroupId = null,
  applauseTotals = {},
  applauseMine = {},
  onApplauseUpdate,
}: Props) {
  const coarsePointer = useIsCoarsePointer();
  const displayMarkdown = useMemo(() => sanitizeAstraMarkdown(markdown), [markdown]);
  const segments = useMemo(
    () => buildAstraHighlightSegments(displayMarkdown, changes),
    [displayMarkdown, changes],
  );
  const renderGroups = useMemo(() => groupAstraSegmentsForRender(segments), [segments]);

  const handleClose = useCallback(() => {
    onPinChange(null);
    onPreviewChange(null);
  }, [onPinChange, onPreviewChange]);

  return (
    <div className="select-text text-sm leading-relaxed">
      {renderGroups.map((group, index) => {
        if (group.kind === 'deletion') {
          const change = group.change;
          const pinned = pinnedChangeId === change.id;
          const preview = previewChangeId === change.id && !pinned;
          return (
            <DeletionMarker
              key={change.id}
              change={change}
              pinned={pinned}
              preview={preview}
              pulsing={pulseChangeId === change.id}
              coarsePointer={coarsePointer}
              onPin={(changeId) => onPinChange(pinnedChangeId === changeId ? null : changeId)}
              onPreview={onPreviewChange}
              onClose={handleClose}
              markdown={displayMarkdown}
              workgroupId={workgroupId}
              applauseTotal={applauseTotals[change.id] ?? 0}
              applauseMine={applauseMine[change.id] ?? 0}
              onApplauseUpdate={
                onApplauseUpdate ? (next) => onApplauseUpdate(change.id, next) : undefined
              }
            />
          );
        }

        const { segments: groupSegments } = group;
        if (groupSegments.length > 1) {
          return (
            <InlineSegmentGroup
              key={`inline-group-${index}`}
              segments={groupSegments.map((segment) => ({
                kind: segment.kind === 'highlight' ? 'highlight' : 'plain',
                text: segment.text,
                change: segment.change,
              }))}
              pinnedChangeId={pinnedChangeId}
              previewChangeId={previewChangeId}
              pulseChangeId={pulseChangeId}
              coarsePointer={coarsePointer}
              onPinChange={onPinChange}
              onPreviewChange={onPreviewChange}
              onClose={handleClose}
              markdown={displayMarkdown}
              workgroupId={workgroupId}
              applauseTotals={applauseTotals}
              applauseMine={applauseMine}
              onApplauseUpdate={onApplauseUpdate}
            />
          );
        }

        const segment = groupSegments[0];
        if (!segment) return null;

        if (segment.kind === 'plain') {
          return <MarkdownBlock key={`plain-${index}`} text={segment.text} />;
        }

        const change = segment.change;
        if (!change) return null;

        const pinned = pinnedChangeId === change.id;
        const preview = previewChangeId === change.id && !pinned;

        return (
          <HighlightBlock
            key={change.id}
            change={change}
            text={segment.text}
            pinned={pinned}
            preview={preview}
            pulsing={pulseChangeId === change.id}
            coarsePointer={coarsePointer}
            onPin={(changeId) => onPinChange(pinnedChangeId === changeId ? null : changeId)}
            onPreview={onPreviewChange}
            onClose={handleClose}
            markdown={displayMarkdown}
            workgroupId={workgroupId}
            applauseTotal={applauseTotals[change.id] ?? 0}
            applauseMine={applauseMine[change.id] ?? 0}
            onApplauseUpdate={
              onApplauseUpdate ? (next) => onApplauseUpdate(change.id, next) : undefined
            }
          />
        );
      })}
    </div>
  );
}

export function AstraDwellPreview({
  change,
  visible,
}: {
  change: AstraChange | null;
  visible: boolean;
}) {
  if (!visible || !change) return null;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950/95 p-3 text-xs shadow-xl">
      <p className="font-semibold text-cyan-200">{ASTRA_OPERATION_LABELS[change.operation]}</p>
      <p className="mt-1 line-clamp-4 text-slate-300">{change.rationale}</p>
      <p className="mt-2 text-slate-500">Click to pin details here</p>
    </div>
  );
}

export { ASTRA_OPERATION_LABELS };
