'use client';

import type { ReactNode } from 'react';
import { ageLabel, type LoopStage, type LoopStatus } from '@/lib/dp-loop-status';

const STATE_STYLE: Record<LoopStage['state'], { dot: string; text: string; label: string }> = {
  ok: { dot: 'bg-emerald-400', text: 'text-emerald-200', label: 'OK' },
  warn: { dot: 'bg-amber-400', text: 'text-amber-200', label: 'Attention' },
  bad: { dot: 'bg-rose-500', text: 'text-rose-200', label: 'Broken' },
  idle: { dot: 'bg-slate-500', text: 'text-slate-300', label: 'Not started' },
  na: { dot: 'bg-slate-700', text: 'text-slate-500', label: 'Not checked' },
};

export function StageCell({ stage }: { stage: LoopStage | undefined }) {
  const s = stage ?? { state: 'na' as const, note: '' };
  const style = STATE_STYLE[s.state] ?? STATE_STYLE.na;
  return (
    <td className="px-2 py-2 align-top">
      <div className="flex items-start gap-1.5" title={`${style.label}: ${s.note}`}>
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${style.dot}`} aria-hidden />
        <span className={`text-xs leading-snug ${style.text}`}>
          <span className="sr-only">{style.label}: </span>
          {s.note || style.label}
        </span>
      </div>
    </td>
  );
}

export function StageLegend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-slate-400">
      {(Object.keys(STATE_STYLE) as LoopStage['state'][]).map((k) => (
        <span key={k} className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${STATE_STYLE[k].dot}`} aria-hidden />
          {STATE_STYLE[k].label}
        </span>
      ))}
    </div>
  );
}

export function Kpi({ label, value, tone = 'neutral', hint }: { label: string; value: ReactNode; tone?: 'neutral' | 'warn' | 'bad' | 'ok'; hint?: string }) {
  const toneCls = {
    neutral: 'text-white',
    ok: 'text-emerald-300',
    warn: 'text-amber-300',
    bad: 'text-rose-300',
  }[tone];
  return (
    <div className="rounded-md border border-slate-800 bg-slate-900/50 px-3 py-2" title={hint}>
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-xl font-semibold tabular-nums ${toneCls}`}>{value}</div>
    </div>
  );
}

export function LoopHeader({
  title,
  subtitle,
  status,
  refreshing,
  onRefresh,
}: {
  title: string;
  subtitle: string;
  status: LoopStatus | null;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="max-w-3xl text-sm text-slate-400">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500">
          Snapshot {status ? ageLabel(status.generated_at) : '…'}
        </span>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="rounded-md bg-cyan-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
        >
          {refreshing ? 'Collecting…' : 'Refresh now'}
        </button>
      </div>
    </div>
  );
}

export function LoopAlerts({ status }: { status: LoopStatus | null }) {
  if (!status) return null;
  const items = [...status.alerts, ...status.errors.map((e) => `Collector: ${e}`)];
  if (!items.length) return null;
  return (
    <ul className="mb-4 space-y-1 rounded-md border border-amber-700/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
      {items.map((a) => (
        <li key={a}>{a}</li>
      ))}
    </ul>
  );
}

export function LoopLoadState({ loading, error }: { loading: boolean; error: string | null }) {
  if (error) {
    return <p className="rounded-md border border-rose-700/50 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">{error}</p>;
  }
  if (loading) return <p className="text-sm text-slate-400">Loading loop snapshot…</p>;
  return null;
}

export function govHubDocUrl(ml: string | undefined) {
  return ml ? `https://interfacehub.net/doc/draft/${ml}/` : undefined;
}
