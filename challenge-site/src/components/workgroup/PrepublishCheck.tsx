'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PrepublishCheck as Check } from '@/lib/prepublish-check.server';

const KIND_LABEL: Record<string, string> = {
  conflict: 'Conflict',
  error: 'Error',
  style: 'Style',
  formatting: 'Formatting',
};

/**
 * Claude's last check before publishing: conflicts to know about, and edits the publisher accepts
 * one by one or all at once (they go straight into the working revision). Publish waits until a
 * check has read the current working revision; onCurrent reports that.
 */
export default function PrepublishCheck({
  workgroupId,
  onCurrent,
  onEdited,
}: {
  workgroupId: string;
  onCurrent: (current: boolean) => void;
  onEdited: () => void;
}) {
  const [check, setCheck] = useState<Check | null>(null);
  const [current, setCurrent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const base = `/api/workgroups/${encodeURIComponent(workgroupId)}/review/prepublish`;

  const fetchCheck = useCallback(async () => {
    const res = await fetch(base, { cache: 'no-store', credentials: 'include' });
    const body = (await res.json().catch(() => ({}))) as { check?: Check | null; current?: boolean; error?: string };
    if (!res.ok) throw new Error(body.error || `Could not load (${res.status})`);
    return { check: body.check ?? null, current: Boolean(body.current) };
  }, [base]);

  const show = useCallback(
    (got: { check: Check | null; current: boolean }) => {
      setCheck(got.check);
      setCurrent(got.current);
      onCurrent(got.current);
    },
    [onCurrent],
  );

  const load = useCallback(async () => show(await fetchCheck()), [fetchCheck, show]);

  useEffect(() => {
    let cancelled = false;
    fetchCheck()
      .then((got) => {
        if (!cancelled) show(got);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchCheck, show]);

  async function run() {
    setRunning(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(base, { method: 'POST', credentials: 'include' });
      const body = (await res.json().catch(() => ({}))) as { check?: Check; error?: string };
      if (!res.ok) throw new Error(body.check?.error || body.error || `Check failed (${res.status})`);
      setCheck(body.check ?? null);
      setCurrent(true);
      onCurrent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check failed');
    } finally {
      setRunning(false);
    }
  }

  async function decide(accept: number[], skip: number[]) {
    if (!check) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`${base}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ checkId: check.id, accept, skip }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        notApplied?: Array<{ index: number; reason: string }>;
        error?: string;
      };
      if (!res.ok) throw new Error(body.error || `Failed (${res.status})`);
      if (body.notApplied?.length) {
        setNotice(`${body.notApplied.length} edit${body.notApplied.length === 1 ? '' : 's'} could not be applied: the text has changed.`);
      }
      if (accept.length) onEdited();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  const open = check ? check.edits.map((_, i) => i).filter((i) => !check.decisions[i]) : [];

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-cyan-900/60 bg-slate-950/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-white">Pre-publish check (Claude Opus 5.5)</h4>
          <p className="text-xs text-slate-400">
            Claude reads the working revision against the published chapter and the style guide, lists conflicts, and
            suggests last edits. Accepted edits go straight into the working revision.
          </p>
        </div>
        <button
          type="button"
          disabled={running || busy}
          onClick={() => void run()}
          className="rounded-lg border border-cyan-700 px-3 py-1.5 text-sm text-cyan-100 hover:border-cyan-400 disabled:opacity-50"
        >
          {running ? 'Claude is reading the chapter…' : check ? 'Run the check again' : 'Run the check'}
        </button>
      </div>
      {loading ? <p className="text-sm text-slate-400">Loading…</p> : null}
      {error ? <p className="text-sm text-rose-200">{error}</p> : null}
      {notice ? <p className="text-sm text-amber-200">{notice}</p> : null}
      {check && !check.error ? (
        <>
          <p className={`text-xs ${current ? 'text-emerald-300' : 'text-amber-200'}`}>
            {current
              ? `Checked ${new Date(check.createdAt).toLocaleString()} by ${check.createdBy || 'someone'}; matches the working revision.`
              : 'The working revision changed since this check. Run it again before publishing.'}
          </p>
          {check.summary ? <p className="text-sm text-slate-200">{check.summary}</p> : null}
          {check.conflicts.length ? (
            <div>
              <p className="text-sm font-medium text-amber-100">Conflicts ({check.conflicts.length})</p>
              <ul className="mt-1 space-y-2">
                {check.conflicts.map((c, i) => (
                  <li key={i} className="rounded border border-amber-900/50 bg-amber-950/10 px-3 py-2 text-sm">
                    <p className="text-amber-100">{c.title}</p>
                    <p className="mt-1 text-slate-300">{c.detail}</p>
                    {c.quote ? <p className="mt-1 text-xs italic text-slate-400">“{c.quote}”</p> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No conflicts found.</p>
          )}
          {check.edits.length ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-white">
                  Suggested edits ({open.length} open of {check.edits.length})
                </p>
                {open.length > 1 && current ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void decide(open, [])}
                    className="rounded-lg bg-cyan-800 px-3 py-1 text-sm text-white hover:bg-cyan-700 disabled:opacity-50"
                  >
                    Accept all {open.length}
                  </button>
                ) : null}
              </div>
              <ul className="mt-2 space-y-2">
                {check.edits.map((e, i) => {
                  const d = check.decisions[i];
                  return (
                    <li key={i} className={`rounded border border-slate-800 px-3 py-2 text-sm ${d ? 'opacity-60' : ''}`}>
                      <p className="text-xs uppercase tracking-wide text-slate-500">{KIND_LABEL[e.kind] || e.kind}</p>
                      <p className="mt-1 whitespace-pre-line text-rose-200/90 line-through decoration-rose-400/50">{e.originalText}</p>
                      <p className="mt-1 whitespace-pre-line text-emerald-200">{e.proposedText || '(delete)'}</p>
                      <p className="mt-1 text-slate-400">{e.reason}</p>
                      {d ? (
                        <p className="mt-1 text-xs text-slate-500">
                          {d.status === 'accepted' ? 'Accepted' : 'Skipped'} by {d.by}
                        </p>
                      ) : current ? (
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void decide([i], [])}
                            className="rounded border border-emerald-800 px-2 py-0.5 text-xs text-emerald-100 hover:border-emerald-500 disabled:opacity-50"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void decide([], [i])}
                            className="rounded px-2 py-0.5 text-xs text-slate-400 hover:text-slate-200 disabled:opacity-50"
                          >
                            Skip
                          </button>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No edits suggested.</p>
          )}
        </>
      ) : null}
      {check?.error ? <p className="text-sm text-rose-200">The last check failed: {check.error}</p> : null}
    </div>
  );
}
