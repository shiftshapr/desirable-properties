'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  adminInviteDispatchClassify,
  adminInviteDispatchDraft,
  adminInviteDispatchDraftStatus,
  adminInviteDispatchPatchRow,
  adminInviteDispatchReview,
  type DispatchWorkgroupCatalogEntry,
  type LongGapDispatchRow,
  type ZohoContactCandidate,
} from '@/lib/admin-invite-api';

type Props = {
  onStartBatch?: (
    contacts: ZohoContactCandidate[],
    prefill?: Record<string, { draft: string; primaryWorkgroupId?: string }>,
  ) => void;
};

function confidenceClass(level?: string) {
  if (level === 'high') return 'text-emerald-300';
  if (level === 'medium') return 'text-amber-300';
  return 'text-slate-400';
}

function rowToZohoCandidate(row: LongGapDispatchRow): ZohoContactCandidate {
  return {
    id: row.email,
    name: row.name || row.email,
    email: row.email,
    confidence: row.confidence || 'low',
    score: row.confidence === 'high' ? 85 : row.confidence === 'medium' ? 60 : 35,
    last_contact: row.last_contact,
    sample_subjects: row.sample_subjects,
    snippets: row.snippets,
    suggested_strategy: 'long_gap_reconnect',
    message_strategy: 'long_gap_reconnect',
    summary: row.why || row.subjects_snippet_summary,
  };
}

export default function AdminInviteLongGapDispatch({ onStartBatch }: Props) {
  const [rows, setRows] = useState<LongGapDispatchRow[]>([]);
  const [catalog, setCatalog] = useState<DispatchWorkgroupCatalogEntry[]>([]);
  const [totalLongGap, setTotalLongGap] = useState(0);
  const [loading, setLoading] = useState(true);
  /** Classify/draft batch actions — do not disable per-row controls (10min ops freeze UI). */
  const [operationBusy, setOperationBusy] = useState(false);
  const [patchingEmail, setPatchingEmail] = useState<string | null>(null);
  const [regeneratingEmail, setRegeneratingEmail] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [dispatchCutoffLabel, setDispatchCutoffLabel] = useState('Jan 1, 2025');
  const [useTemplateDrafts, setUseTemplateDrafts] = useState(true);
  const [templateModeNotice, setTemplateModeNotice] = useState<string | null>(
    'Using template emails (no AI draft)',
  );

  const loadReview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminInviteDispatchReview();
      const rawRows = data.rows;
      const list: LongGapDispatchRow[] = Array.isArray(rawRows)
        ? rawRows
        : Object.values(rawRows ?? {}) as LongGapDispatchRow[];
      setRows(list);
      setCatalog(data.workgroup_catalog || []);
      setTotalLongGap(data.total_long_gap || list.length);
      if (data.dispatch_cutoff_label) {
        setDispatchCutoffLabel(data.dispatch_cutoff_label);
      }
      setUseTemplateDrafts(data.use_template_drafts !== false);
      setTemplateModeNotice(
        data.template_mode_notice
          || (data.use_template_drafts !== false
            ? 'Using template emails (no AI draft)'
            : null),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load long-gap dispatch');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReview();
  }, [loadReview]);

  const filteredRows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.email.toLowerCase().includes(q)
        || (row.name || '').toLowerCase().includes(q)
        || (row.why || '').toLowerCase().includes(q),
    );
  }, [filter, rows]);

  const stats = useMemo(() => {
    const classified = rows.filter((r) => r.classification_status === 'done').length;
    const approved = rows.filter((r) => r.approved && !r.skip).length;
    const drafted = rows.filter((r) => r.draft_status === 'done' && r.draft_body).length;
    const skipped = rows.filter((r) => r.skip).length;
    return { classified, approved, drafted, skipped };
  }, [rows]);

  async function runClassify(force = false, onlyEmails?: string[]) {
    setOperationBusy(true);
    setError(null);
    setNotice(force ? 'Re-classifying contacts…' : 'Classifying long-gap contacts…');
    try {
      const data = await adminInviteDispatchClassify({
        force,
        emails: onlyEmails,
      });
      if (data.error) throw new Error(data.error);
      await loadReview();
      const errNote = data.errors?.length ? ` (${data.errors.length} batch errors)` : '';
      setNotice(
        `Classified ${data.classified ?? 0} of ${data.total_long_gap ?? totalLongGap} long-gap contacts${errNote}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Classification failed');
      setNotice(null);
    } finally {
      setOperationBusy(false);
    }
  }

  async function runDraft(options?: { emails?: string[]; force?: boolean }) {
    const force = Boolean(options?.force);
    const targetEmails = options?.emails;
    setOperationBusy(true);
    setError(null);
    setNotice(
      force && targetEmails?.length === 1
        ? `Regenerating draft for ${targetEmails[0]}…`
        : 'Starting draft job for approved contacts…',
    );
    try {
      const data = await adminInviteDispatchDraft({
        emails: targetEmails,
        force,
      });
      if (data.error) throw new Error(data.error);

      if (data.use_template_drafts || data.status === 'done') {
        await loadReview();
        const drafted = data.drafted ?? 0;
        const errCount = data.errors ?? 0;
        const errNote = errCount > 0 ? ` (${errCount} row errors — see Status column)` : '';
        setNotice(
          data.message
            || `Drafted ${drafted} approved contact(s)${errNote}.`,
        );
        return;
      }

      const initialTotal = data.total ?? 0;
      if (data.status === 'done' && initialTotal === 0) {
        await loadReview();
        setNotice('No approved contacts need drafting.');
        return;
      }

      const pollIntervalMs = 2500;
      const maxPollMs = 30 * 60 * 1000;
      const startedAt = Date.now();

      async function pollUntilDone(): Promise<{
        status?: string;
        drafted?: number;
        errors?: number;
        total?: number;
        error?: string;
      }> {
        const status = await adminInviteDispatchDraftStatus();
        if (status.error && status.status === 'error') {
          throw new Error(status.error);
        }
        const total = status.total ?? initialTotal;
        const completed = status.completed ?? 0;
        const drafted = status.drafted ?? 0;
        const errCount = status.errors ?? 0;
        if (status.status === 'running') {
          const current = status.current_email
            ? ` (${status.current_email})`
            : '';
          setNotice(
            `Drafting ${completed}/${total}… ${drafted} done, ${errCount} errors${current}`,
          );
        }
        if (status.status === 'done' || status.status === 'idle') {
          return status;
        }
        if (status.status === 'error') {
          throw new Error(status.error || 'Draft job failed');
        }
        if (Date.now() - startedAt > maxPollMs) {
          throw new Error(
            'Draft job is still running after 30 minutes. Refresh to see partial progress.',
          );
        }
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        return pollUntilDone();
      }

      const finalStatus = await pollUntilDone();
      await loadReview();
      const drafted = finalStatus.drafted ?? data.drafted ?? 0;
      const errCount = finalStatus.errors ?? 0;
      const errNote = errCount > 0 ? ` (${errCount} row errors — see Status column)` : '';
      setNotice(`Drafted ${drafted} approved contact(s)${errNote}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Draft failed');
      setNotice(null);
      try {
        await loadReview();
      } catch {
        // keep partial progress visible if refresh works
      }
    } finally {
      setOperationBusy(false);
      setRegeneratingEmail(null);
    }
  }

  async function applyTemplatesToAllApproved() {
    const approvedEmails = rows
      .filter((row) => row.approved && !row.skip)
      .map((row) => row.email);
    if (!approvedEmails.length) {
      setError('No approved non-skip contacts to template.');
      return;
    }
    await runDraft({ emails: approvedEmails, force: true });
  }

  async function regenerateRowDraft(email: string) {
    const rowKey = email.trim().toLowerCase();
    setRegeneratingEmail(rowKey);
    await runDraft({ emails: [email], force: true });
  }

  async function patchRow(email: string, patch: Partial<LongGapDispatchRow>) {
    const rowKey = email.trim().toLowerCase();
    setError(null);
    setPatchingEmail(rowKey);
    setRows((prev) =>
      prev.map((row) =>
        row.email.trim().toLowerCase() === rowKey ? { ...row, ...patch } : row,
      ),
    );
    try {
      const data = await adminInviteDispatchPatchRow({
        email,
        dp_suggestion: patch.dp_suggestion,
        dp_label: patch.dp_label,
        skip: patch.skip,
        skip_reason: patch.skip_reason,
        approved: patch.approved,
        intern_alum: patch.intern_alum,
      });
      if (data.row) {
        setRows((prev) =>
          prev.map((row) =>
            row.email.trim().toLowerCase() === rowKey ? { ...row, ...data.row } : row,
          ),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
      await loadReview();
    } finally {
      setPatchingEmail((current) => (current === rowKey ? null : current));
    }
  }

  function buildPrefillFromRows(
    sourceRows: LongGapDispatchRow[],
  ): Record<string, { draft: string; primaryWorkgroupId?: string }> {
    const prefill: Record<string, { draft: string; primaryWorkgroupId?: string }> = {};
    for (const row of sourceRows) {
      const body = row.draft_body?.trim();
      if (!row.approved || row.skip || !body) continue;
      prefill[row.email.trim().toLowerCase()] = {
        draft: body,
        ...(row.dp_suggestion ? { primaryWorkgroupId: row.dp_suggestion } : {}),
      };
    }
    return prefill;
  }

  async function startBatchSend() {
    setOperationBusy(true);
    setError(null);
    try {
      const data = await adminInviteDispatchReview();
      const freshRows: LongGapDispatchRow[] = Array.isArray(data.rows)
        ? data.rows
        : (Object.values(data.rows ?? {}) as LongGapDispatchRow[]);
      setRows(freshRows);
      const batchContacts = freshRows
        .filter((row) => row.approved && !row.skip && row.draft_body?.trim())
        .map(rowToZohoCandidate);
      if (!batchContacts.length) {
        setError('No approved drafted contacts to send. Draft approved contacts first.');
        return;
      }
      const prefill = buildPrefillFromRows(freshRows);
      onStartBatch?.(batchContacts, prefill);
      setNotice(`Loaded ${batchContacts.length} drafted contact(s) into batch review.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load batch drafts');
    } finally {
      setOperationBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-violet-900/50 bg-violet-950/20 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Long-gap dispatch</h3>
          <p className="mt-1 text-sm text-slate-400">
            Phase 1: classify {totalLongGap || '—'} selected contacts with no email since{' '}
            {dispatchCutoffLabel} (last touch before that date). Phase 2: draft long-gap reconnect
            emails for approved rows, then send via batch review.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Classified {stats.classified} · Approved {stats.approved} · Drafted {stats.drafted} ·
            Skipped {stats.skipped}
          </p>
          {useTemplateDrafts && templateModeNotice ? (
            <p className="mt-2 text-xs text-cyan-300/90">{templateModeNotice}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={operationBusy || loading}
            onClick={() => void runClassify(false)}
            className="rounded-lg bg-violet-700 px-3 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
          >
            Classify {totalLongGap || 'long-gap'}
          </button>
          {rows.some((row) => row.classification_status === 'error') ? (
            <button
              type="button"
              disabled={operationBusy || loading}
              onClick={() =>
                void runClassify(
                  true,
                  rows
                    .filter((row) => row.classification_status === 'error')
                    .map((row) => row.email),
                )
              }
              className="rounded-lg border border-amber-700/60 px-3 py-2 text-sm text-amber-100 hover:border-amber-500 disabled:opacity-50"
            >
              Re-classify errors
            </button>
          ) : null}
          <button
            type="button"
            disabled={operationBusy || loading}
            onClick={() => void runDraft()}
            className="rounded-lg border border-violet-700/60 px-3 py-2 text-sm text-violet-100 hover:border-violet-500 disabled:opacity-50"
          >
            {useTemplateDrafts ? 'Draft approved (templates)' : 'Draft approved'}
          </button>
          {useTemplateDrafts ? (
            <button
              type="button"
              disabled={operationBusy || loading}
              onClick={() => void applyTemplatesToAllApproved()}
              className="rounded-lg border border-emerald-800/60 px-3 py-2 text-sm text-emerald-100 hover:border-emerald-500 disabled:opacity-50"
            >
              Apply templates to all approved
            </button>
          ) : null}
          <button
            type="button"
            disabled={operationBusy || loading}
            onClick={() => startBatchSend()}
            className="rounded-lg border border-cyan-800/60 px-3 py-2 text-sm text-cyan-100 hover:border-cyan-500 disabled:opacity-50"
          >
            Open batch send
          </button>
        </div>
      </div>

      {notice ? <p className="mt-3 text-sm text-violet-200">{notice}</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by name, email, or why…"
          className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          disabled={loading}
        />
        <button
          type="button"
          disabled={loading || operationBusy}
          onClick={() => void loadReview()}
          className="text-sm text-slate-400 hover:text-slate-200 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-slate-400">Loading long-gap rows…</p>
      ) : filteredRows.length === 0 ? (
        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-400">
          <p className="font-medium text-slate-200">
            {totalLongGap > 0
              ? `${totalLongGap} long-gap contact(s) in your Zoho selection`
              : 'No long-gap contacts yet'}
          </p>
          <p className="mt-2">
            {totalLongGap > 0
              ? 'Run classify below to score workgroup matches, or adjust the filter if rows are hidden.'
              : 'Use the Zoho pathway below to scan your inbox and save a batch selection. Long-gap contacts are those with no email since the cutoff date (last touch before that date). You can classify and draft here without starting a manual invite first.'}
          </p>
          {filter.trim() && rows.length > 0 ? (
            <p className="mt-2 text-amber-200/90">No rows match your filter — clear the filter to see all rows.</p>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-950/80 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Contact</th>
                <th className="px-3 py-2">Last contact</th>
                <th className="px-3 py-2">Suggested DP</th>
                <th className="px-3 py-2">Intern</th>
                <th className="px-3 py-2">Skip</th>
                <th className="px-3 py-2">Why</th>
                <th className="px-3 py-2">Approve</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredRows.map((row) => (
                <tr key={row.email} className="align-top">
                  <td className="px-3 py-2">
                    <div className="font-medium text-white">{row.name}</div>
                    <div className="text-xs text-slate-400">{row.email}</div>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-400">
                    {row.last_contact
                      ? new Date(row.last_contact).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={row.dp_suggestion || ''}
                      disabled={patchingEmail === row.email.trim().toLowerCase()}
                      onChange={(e) => {
                        const value = e.target.value;
                        const entry = catalog.find((wg) => wg.id === value);
                        void patchRow(row.email, {
                          dp_suggestion: value || null,
                          dp_label: entry?.name || '',
                        });
                      }}
                      className="w-full min-w-[10rem] rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 disabled:opacity-60"
                    >
                      <option value="">— none —</option>
                      {catalog.map((wg) => (
                        <option key={wg.id} value={wg.id}>
                          {wg.name || wg.slug || wg.id}
                        </option>
                      ))}
                    </select>
                    <div className={`mt-1 text-xs ${confidenceClass(row.confidence)}`}>
                      {row.confidence || 'low'}
                      {row.classification_status === 'error' ? ' · classify error' : ''}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={Boolean(row.intern_alum)}
                        disabled={patchingEmail === row.email.trim().toLowerCase()}
                        onChange={(e) => void patchRow(row.email, { intern_alum: e.target.checked })}
                        aria-label={`Intern alum ${row.email}`}
                      />
                      <span className="text-xs text-slate-300">Intern alum</span>
                    </label>
                    {row.intern_alum_overridden ? (
                      <div className="mt-0.5 text-[10px] text-amber-400/90">manual override</div>
                    ) : row.intern_alum ? (
                      <div className="mt-0.5 text-[10px] text-slate-500">from classify</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={Boolean(row.skip)}
                      disabled={patchingEmail === row.email.trim().toLowerCase()}
                      onChange={(e) => void patchRow(row.email, { skip: e.target.checked })}
                      aria-label={`Skip ${row.email}`}
                    />
                  </td>
                  <td className="px-3 py-2 max-w-xs text-xs text-slate-400">
                    {row.why || row.subjects_snippet_summary || '—'}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={Boolean(row.approved)}
                      disabled={patchingEmail === row.email.trim().toLowerCase() || row.skip}
                      onChange={(e) => void patchRow(row.email, { approved: e.target.checked })}
                      aria-label={`Approve ${row.email}`}
                    />
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-400">
                    <div>classify: {row.classification_status || 'pending'}</div>
                    {row.classification_error ? (
                      <div className="text-amber-300">{row.classification_error}</div>
                    ) : null}
                    <div>draft: {row.draft_status || 'pending'}</div>
                    {row.draft_error ? (
                      <div className="text-rose-300">{row.draft_error}</div>
                    ) : null}
                    {row.approved && !row.skip ? (
                      <button
                        type="button"
                        disabled={
                          operationBusy
                          || regeneratingEmail === row.email.trim().toLowerCase()
                        }
                        onClick={() => void regenerateRowDraft(row.email)}
                        className="mt-1 rounded border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300 hover:border-violet-500 hover:text-violet-100 disabled:opacity-50"
                      >
                        {regeneratingEmail === row.email.trim().toLowerCase()
                          ? 'Regenerating…'
                          : 'Regenerate draft'}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
