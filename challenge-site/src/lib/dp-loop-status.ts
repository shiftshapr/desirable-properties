'use client';

import { useCallback, useEffect, useState } from 'react';

/** Shape of data/loop/dp-loop-status.json (scripts/dp_loop_status.py, schema dp-loop-status/v1). */
export type LoopStageState = 'ok' | 'warn' | 'bad' | 'idle' | 'na';
export type LoopStage = { state: LoopStageState; note: string };

export type LoopServed = {
  submission: string;
  revision: string;
  approved_at: string;
  hash: string;
  what_changed: string;
} | null;

export type LoopBookRow = {
  dp: string;
  ml: string;
  label: string;
  proposals: Record<string, number>;
  channels: Record<string, number>;
  served: LoopServed;
  working: { submission: string; revision: string; applied: number } | null;
  brc333?: Record<string, unknown>;
  stages: Record<'review' | 'govhub' | 'rail' | 'staging' | 'prod' | 'brc333_web' | 'brc333_chain', LoopStage>;
};

export type LoopReqRow = {
  dp: string;
  ml: string;
  label: string;
  served: LoopServed;
  reqset: {
    reqs?: number;
    must?: number;
    should?: number;
    could?: number;
    release?: string;
    source_kind?: string;
    source_revision?: string | null;
    generated_at?: string | null;
    adr_sketches?: number;
    packing?: string;
    astra?: { baselineMlDraft?: string };
  };
  req_ids: string[];
  adr_sketch_ids: string[];
  clone: { file: string; diff?: { added?: string[]; removed?: string[]; changed?: string[] }; source_revision?: string } | null;
  code_refs: Record<string, number>;
  stages: Record<'govhub' | 'ml_req_working' | 'ml_req_published' | 'ml_adr' | 'coding', LoopStage>;
};

export type LoopStatus = {
  schema: string;
  generated_at: string;
  totals: Record<string, number>;
  alerts: string[];
  errors: string[];
  rail_sync: {
    repo: string;
    workflow: string;
    error: string | null;
    runs: { databaseId: number; status: string; conclusion: string; event: string; createdAt: string; url: string }[];
  };
  book: LoopBookRow[];
  reqs: LoopReqRow[];
  records: {
    meta_console: {
      reqs: { id: string; status: string | null; title: string | null }[];
      adrs: { id: string; status: string | null; title: string | null; decides_for: string[] }[];
    };
    govhub_numbered: { ml: string; doc_type: string; status: string; title: string }[];
  };
  code: {
    repos: Record<string, { refs: number; uncommitted_paths: number; head: string }>;
    issues: { items: { title: string; url: string; state: string }[]; error: string | null };
  };
};

async function fetchLoopStatus(method: 'GET' | 'POST'): Promise<{ status?: LoopStatus; error?: string }> {
  try {
    const res = await fetch('/api/admin/loop-status', { method, credentials: 'include' });
    const data = await res.json();
    if (!res.ok || !data.ok) return { error: data.message || 'Could not load loop status' };
    return { status: data.status as LoopStatus };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Load failed' };
  }
}

export function useLoopStatus() {
  const [status, setStatus] = useState<LoopStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const apply = useCallback((result: { status?: LoopStatus; error?: string }) => {
    if (result.status) setStatus(result.status);
    setError(result.error ?? null);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    let alive = true;
    void fetchLoopStatus('GET').then((r) => {
      if (alive) apply(r);
    });
    return () => {
      alive = false;
    };
  }, [apply]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    void fetchLoopStatus('POST').then(apply);
  }, [apply]);

  const reload = useCallback(() => {
    void fetchLoopStatus('GET').then(apply);
  }, [apply]);

  return { status, error, loading, refreshing, reload, refresh };
}

export function ageLabel(iso: string | undefined | null): string {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return iso;
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
