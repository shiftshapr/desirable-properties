'use client';

/**
 * Small shared pieces for the listening workspace. Everything renders stored content as plain React
 * text: no dangerouslySetInnerHTML, no Markdown, no HTML from the record.
 */
import { createContext, useContext } from 'react';
import type { WorkspaceState } from '@/lib/listening/reducer';
import { CARD_LABEL_TEXT, clockFromMs, type CardLabel, type ContributionKind, type SourceRef, type TargetType } from '@/lib/listening/types';

/** What a new contribution is about. `kind` preselects the action (e.g. Request a correction on a line). */
export type Target = { type: TargetType; id: string | null; label: string; kind?: ContributionKind };

export type ActResult = { ok: true; data: Record<string, unknown> } | { ok: false; status: number; message: string };

export type WorkspaceApi = {
  state: WorkspaceState;
  act: (type: string, payload: Record<string, unknown>) => Promise<ActResult>;
  setTarget: (t: Target) => void;
  showSegment: (segmentId: string) => void;
  showCard: (cardId: string) => void;
  login: () => void;
};

export const WorkspaceContext = createContext<WorkspaceApi | null>(null);

export function useWorkspace(): WorkspaceApi {
  const v = useContext(WorkspaceContext);
  if (!v) throw new Error('useWorkspace outside ListeningWorkspace');
  return v;
}

const LABEL_CLASS: Record<CardLabel, string> = {
  participant_proposal: 'border-emerald-700/60 bg-emerald-950/40 text-emerald-200',
  claude_synthesis: 'border-violet-700/60 bg-violet-950/40 text-violet-200',
  disputed_interpretation: 'border-amber-700/60 bg-amber-950/40 text-amber-200',
  facilitator_confirmed: 'border-cyan-700/60 bg-cyan-950/40 text-cyan-200',
  council_decision: 'border-rose-700/60 bg-rose-950/40 text-rose-200',
  added_after_meeting: 'border-orange-700/60 bg-orange-950/40 text-orange-200',
};

export function LabelChip({ label }: { label: CardLabel | null }) {
  if (!label) return null;
  return (
    <span
      data-testid="card-label"
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${LABEL_CLASS[label]}`}
    >
      {CARD_LABEL_TEXT[label]}
    </span>
  );
}

export function SourceChips({ refs }: { refs: SourceRef[] }) {
  const { state, showSegment } = useWorkspace();
  if (!refs.length) {
    return <span className="text-[11px] text-slate-500">No transcript source</span>;
  }
  const segById = new Map(state.segments.map((s) => [s.id, s]));
  const shown = refs.slice(0, 6);
  return (
    <span className="inline-flex flex-wrap items-center gap-1" data-testid="card-sources">
      <span className="text-[11px] text-slate-500">Sources:</span>
      {shown.map((r) => {
        if (r.type === 'segment') {
          const seg = segById.get(r.id);
          return (
            <button
              key={`${r.type}:${r.id}`}
              type="button"
              onClick={() => showSegment(r.id)}
              className="rounded border border-slate-700 px-1.5 py-0.5 font-mono text-[11px] text-cyan-300 hover:border-cyan-600"
              title={seg ? 'Open this point in the transcript' : 'Not in the transcript yet (replay in progress)'}
            >
              {seg ? clockFromMs(seg.startMs) : '…'}
            </button>
          );
        }
        return (
          <span key={`${r.type}:${r.id}`} className="rounded border border-slate-700 px-1.5 py-0.5 text-[11px] text-emerald-300">
            participant contribution
          </span>
        );
      })}
      {refs.length > shown.length ? <span className="text-[11px] text-slate-500">+{refs.length - shown.length} more</span> : null}
    </span>
  );
}

export function formatWhen(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export const panelClass = 'rounded-2xl border border-slate-800 bg-slate-900/40';
export const buttonClass =
  'rounded-lg border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-200 hover:border-cyan-600 hover:text-cyan-200 disabled:opacity-50';
export const primaryButtonClass =
  'rounded-lg bg-cyan-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50';
