'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminInviteLongGapDispatch from '@/components/admin/AdminInviteLongGapDispatch';
import { DpDialog, DpDialogHost } from '@/components/DpDialog';
import { useAdminToast } from '@/components/AdminToastHost';
import {
  adminInviteBatchHistory,
  adminInviteDispatchReview,
  adminInviteDispatchSend,
  adminInviteDispatchSendAll,
  adminInviteDispatchSendAllStatus,
  adminInviteDispatchRetryFailed,
  adminInviteDispatchTemplate,
  type AdminInviteSendRecord,
  type DispatchWorkgroupCatalogEntry,
  type LongGapDispatchRow,
  type LongGapSendAllJobStatus,
  type LongGapTemplateStructure,
} from '@/lib/admin-invite-api';

function workgroupShortDesc(
  row: LongGapDispatchRow | null,
  catalog: DispatchWorkgroupCatalogEntry[],
): string {
  const dpId = row?.dp_suggestion?.trim();
  if (!dpId) return row?.dp_label?.trim() || 'this workgroup';
  const entry = catalog.find((item) => item.id === dpId);
  const desc = (entry?.description || '').trim();
  if (desc) return desc.replace(/\.$/, '');
  return row?.dp_label?.trim() || 'this workgroup';
}

function workgroupPublicUrl(
  row: LongGapDispatchRow | null,
  catalog: DispatchWorkgroupCatalogEntry[],
): string {
  const dpId = row?.dp_suggestion?.trim();
  const entry = dpId ? catalog.find((item) => item.id === dpId) : undefined;
  const slug = entry?.slug?.trim();
  return slug
    ? `https://desirableproperties.org/workgroups/${slug}`
    : 'https://desirableproperties.org/workgroups';
}

function rowDraftReady(row: LongGapDispatchRow): boolean {
  return row.draft_status === 'done' && Boolean(row.draft_body?.trim());
}

function sendStatusForRow(
  email: string,
  history: Record<string, AdminInviteSendRecord[]>,
): { label: string; tone: 'pending' | 'sent' | 'error' } {
  const key = email.trim().toLowerCase();
  const rows = history[key] || [];
  const latest = rows.find((row) => row.status === 'sent');
  if (latest) return { label: 'Sent', tone: 'sent' };
  const err = rows.find((row) => row.status === 'skipped');
  if (err) return { label: 'Skipped', tone: 'error' };
  return { label: 'Pending', tone: 'pending' };
}

function sanitizeFirstName(name?: string | null): string {
  let s = (name || '').trim().replace(/\s+/g, ' ');
  const quotePair = /^["'""''«»].*["'""''«»]$/;
  while (s.length >= 2 && quotePair.test(s)) {
    s = s.slice(1, -1).trim();
  }
  s = s.replace(/^["'""''«».,;:]+/, '').replace(/["'""''«».,;:]+$/, '');
  const first = s.split(' ')[0] || '';
  return first.replace(/^["'""''«».,;:]+/, '').replace(/["'""''«».,;:]+$/, '') || 'there';
}

function dpCardImageUrl(
  row: LongGapDispatchRow | null,
  catalog: DispatchWorkgroupCatalogEntry[],
): string | null {
  const dpId = row?.dp_suggestion?.trim();
  const entry = dpId ? catalog.find((item) => item.id === dpId) : undefined;
  const label = (entry?.name || row?.dp_label || '').trim();
  const match = label.match(/DP\s*0*(\d+)/i);
  if (!match) return null;
  return `https://desirableproperties.org/images/dps/card/DP${match[1]}.webp`;
}

function TemplatePreview({
  template,
  subject,
  selectedRow,
  catalog,
}: {
  template: LongGapTemplateStructure | null;
  subject: string;
  selectedRow: LongGapDispatchRow | null;
  catalog: DispatchWorkgroupCatalogEntry[];
}) {
  if (!template) {
    return (
      <p className="text-sm text-slate-400">Loading template…</p>
    );
  }

  const hasDp = Boolean(selectedRow?.dp_suggestion && selectedRow?.dp_label);
  const dpBlock = hasDp
    ? template.with_dp
        ?.replace('{dp_label}', selectedRow?.dp_label || '{dp_label}')
        .replace('{workgroup_short_desc}', workgroupShortDesc(selectedRow, catalog))
        .replace('{workgroup_link}', workgroupPublicUrl(selectedRow, catalog))
    : template.no_dp;

  const progressionImageUrl =
    template.progression_image_url ||
    'https://desirableproperties.org/images/dp-challenge-arc.jpg';
  const dpImageUrl = hasDp ? dpCardImageUrl(selectedRow, catalog) : null;
  const previewFirstName = sanitizeFirstName(selectedRow?.name);

  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-200">
      <p className="text-xs uppercase tracking-wide text-slate-500">Subject</p>
      <p className="rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-slate-100">
        {subject}
      </p>
      <p className="text-xs uppercase tracking-wide text-slate-500">Form letter structure</p>
      <div className="rounded-md border border-slate-700 bg-slate-950/60 px-3 py-3 space-y-3 whitespace-pre-wrap">
        <div className="not-prose">
          <img
            src={progressionImageUrl}
            alt="Desirable Properties Challenge through Overweb progression"
            className="w-full max-w-xl rounded-md border border-slate-700/80"
          />
        </div>
        <p>{template.greeting?.replace('{first_name}', previewFirstName)}</p>
        <p>{template.opening}</p>
        <p>{template.middle}</p>
        <p>{template.contribution}</p>
        {dpImageUrl ? (
          <div className="not-prose">
            <img
              src={dpImageUrl}
              alt={selectedRow?.dp_label || 'Workgroup illustration'}
              className="w-full max-w-sm rounded-md border border-cyan-900/40"
            />
          </div>
        ) : null}
        <p className={hasDp ? 'text-cyan-200/90' : 'text-amber-200/90'}>{dpBlock}</p>
        <p>{template.signoff}</p>
      </div>
      {selectedRow?.draft_body ? (
        <>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Draft for {selectedRow.name || selectedRow.email}
          </p>
          <pre className="max-h-72 overflow-auto rounded-md border border-cyan-900/40 bg-cyan-950/20 px-3 py-3 text-xs text-cyan-50/95 whitespace-pre-wrap">
            {selectedRow.draft_body}
          </pre>
        </>
      ) : null}
    </div>
  );
}

export default function AdminLongGapSendPanel() {
  const { showToast } = useAdminToast();
  const [rows, setRows] = useState<LongGapDispatchRow[]>([]);
  const [catalog, setCatalog] = useState<DispatchWorkgroupCatalogEntry[]>([]);
  const [template, setTemplate] = useState<LongGapTemplateStructure | null>(null);
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [sendHistory, setSendHistory] = useState<Record<string, AdminInviteSendRecord[]>>({});
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [testMode, setTestMode] = useState(true);
  const [testEmail, setTestEmail] = useState('');
  const [testSourceEmail, setTestSourceEmail] = useState('');
  const [testBusy, setTestBusy] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bulkSendBusy, setBulkSendBusy] = useState(false);
  const [bulkSendNotice, setBulkSendNotice] = useState<string | null>(null);
  const [retryAvailable, setRetryAvailable] = useState(0);

  const pollBulkSendJob = useCallback(
    async (initialTotal: number, label: 'Sending' | 'Retrying') => {
      const pollIntervalMs = 2500;
      const maxPollMs = 45 * 60 * 1000;
      const startedAt = Date.now();

      async function pollUntilDone(): Promise<LongGapSendAllJobStatus> {
        const status = await adminInviteDispatchSendAllStatus();
        if (status.error && status.status === 'error') {
          throw new Error(status.error);
        }
        const total = status.total ?? initialTotal;
        const completed = status.completed ?? 0;
        const sent = status.sent ?? 0;
        const errCount = status.errors ?? 0;
        if (status.status === 'running') {
          const current = status.current_email ? ` (${status.current_email})` : '';
          setBulkSendNotice(
            `${label} ${completed}/${total}… ${sent} sent, ${errCount} failed${current}`,
          );
        }
        if (status.status === 'done' || status.status === 'idle') {
          return status;
        }
        if (status.status === 'error') {
          throw new Error(status.error || 'Bulk send failed');
        }
        if (Date.now() - startedAt > maxPollMs) {
          throw new Error(
            'Bulk send is still running after 45 minutes. Refresh to see partial progress.',
          );
        }
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        return pollUntilDone();
      }

      return pollUntilDone();
    },
    [],
  );

  const refreshRetryAvailable = useCallback(async () => {
    try {
      const status = await adminInviteDispatchSendAllStatus();
      setRetryAvailable(status.retry_available ?? 0);
    } catch {
      setRetryAvailable(0);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [review, tmpl] = await Promise.all([
        adminInviteDispatchReview(),
        adminInviteDispatchTemplate(),
      ]);
      const list: LongGapDispatchRow[] = Array.isArray(review.rows)
        ? review.rows
        : (Object.values(review.rows ?? {}) as LongGapDispatchRow[]);
      const approved = list.filter((row) => row.approved && !row.skip);
      setRows(approved);
      setCatalog(review.workgroup_catalog || []);
      setTemplate(tmpl.template || null);
      setSubject(tmpl.subject || '');
      setSelectedEmail((current) => current || approved[0]?.email || null);
      setTestSourceEmail((current) => current || approved[0]?.email || '');
      const emails = approved.map((row) => row.email);
      if (emails.length) {
        const hist = await adminInviteBatchHistory({ recipient_emails: emails });
        setSendHistory(hist.history_by_email || {});
      }
      await refreshRetryAvailable();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load long-gap send list');
    } finally {
      setLoading(false);
    }
  }, [refreshRetryAvailable]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.email.toLowerCase().includes(q)
        || (row.name || '').toLowerCase().includes(q)
        || (row.dp_label || '').toLowerCase().includes(q),
    );
  }, [filter, rows]);

  const selectedRow = useMemo(
    () => rows.find((row) => row.email === selectedEmail) || null,
    [rows, selectedEmail],
  );

  const pendingSendCount = useMemo(
    () =>
      rows.filter((row) => {
        if (!rowDraftReady(row)) return false;
        const status = sendStatusForRow(row.email, sendHistory);
        return status.tone !== 'sent';
      }).length,
    [rows, sendHistory],
  );

  const bulkSendDisabledReason = useMemo(() => {
    if (loading) return 'Loading contacts…';
    if (bulkSendBusy) return 'Bulk send in progress…';
    if (pendingSendCount === 0) {
      return 'No approved contacts with completed drafts are waiting to send.';
    }
    if (testMode) return 'Turn off test mode below to send to real contacts.';
    return null;
  }, [loading, bulkSendBusy, pendingSendCount, testMode]);

  const retryFailedDisabledReason = useMemo(() => {
    if (loading) return 'Loading contacts…';
    if (bulkSendBusy) return 'Bulk send in progress…';
    if (retryAvailable === 0) return 'No failed contacts from the last bulk send need retry.';
    if (testMode) return 'Turn off test mode below to send to real contacts.';
    return null;
  }, [loading, bulkSendBusy, retryAvailable, testMode]);

  async function runBulkSendJob(options: {
    start: () => Promise<LongGapSendAllJobStatus>;
    confirmTitle: string;
    confirmMessage: string;
    confirmLabel: string;
    startingNotice: string;
    pollLabel: 'Sending' | 'Retrying';
    fallbackTotal: number;
  }) {
    const ok = await DpDialog.confirm({
      title: options.confirmTitle,
      message: options.confirmMessage,
      variant: 'danger',
      confirmLabel: options.confirmLabel,
      cancelLabel: 'Cancel',
    });
    if (!ok) return;

    setBulkSendBusy(true);
    setBulkSendNotice(options.startingNotice);
    setError(null);
    try {
      const data = await options.start();
      if (data.error) throw new Error(data.error);

      if (data.status === 'done' && (data.total ?? 0) === 0) {
        setBulkSendNotice(data.message || 'Nothing left to send.');
        showToast('ok', data.message || 'Nothing left to send.');
        await load();
        return;
      }

      const finalStatus = await pollBulkSendJob(
        data.total ?? options.fallbackTotal,
        options.pollLabel,
      );
      const sent = finalStatus.sent ?? 0;
      const errCount = finalStatus.errors ?? 0;
      const skipped = finalStatus.skipped ?? 0;
      const alreadySent = finalStatus.already_sent ?? 0;
      const errDetails = finalStatus.error_details || [];
      let summary = `Sent ${sent} of ${finalStatus.total ?? options.fallbackTotal}.`;
      if (skipped > 0) summary += ` ${skipped} skipped (already sent).`;
      if (alreadySent > 0) summary += ` ${alreadySent} were already sent before this run.`;
      if (errCount > 0) {
        const firstErr = errDetails[0];
        summary += ` ${errCount} failed`;
        if (firstErr?.email) summary += ` (e.g. ${firstErr.email})`;
        summary += '.';
      }
      setBulkSendNotice(summary);
      showToast(errCount > 0 ? 'err' : 'ok', summary);
      if (errDetails.length) {
        setError(
          errDetails
            .slice(0, 8)
            .map((row) => `${row.email}: ${row.error}`)
            .join('\n'),
        );
      }
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bulk send failed';
      setError(msg);
      setBulkSendNotice(null);
      showToast('err', msg);
    } finally {
      setBulkSendBusy(false);
    }
  }

  async function sendAllApproved() {
    if (testMode) {
      showToast('err', 'Turn off test mode before sending to real contacts.');
      return;
    }
    if (pendingSendCount === 0) {
      showToast('err', 'No pending approved contacts to send.');
      return;
    }
    await runBulkSendJob({
      start: adminInviteDispatchSendAll,
      confirmTitle: 'Send all approved contacts',
      confirmMessage: `Send to ${pendingSendCount} contact${pendingSendCount === 1 ? '' : 's'}? This cannot be undone.`,
      confirmLabel: 'Send all',
      startingNotice: 'Starting bulk send…',
      pollLabel: 'Sending',
      fallbackTotal: pendingSendCount,
    });
  }

  async function retryFailedOnly() {
    if (testMode) {
      showToast('err', 'Turn off test mode before sending to real contacts.');
      return;
    }
    if (retryAvailable === 0) {
      showToast('err', 'No failed contacts to retry.');
      return;
    }
    await runBulkSendJob({
      start: adminInviteDispatchRetryFailed,
      confirmTitle: 'Retry failed contacts',
      confirmMessage: `Retry ${retryAvailable} contact${retryAvailable === 1 ? '' : 's'} from the last bulk send?`,
      confirmLabel: 'Retry failed',
      startingNotice: 'Starting retry for failed contacts…',
      pollLabel: 'Retrying',
      fallbackTotal: retryAvailable,
    });
  }

  async function sendOne(email: string, options?: { test?: boolean }) {
    const isTest = Boolean(options?.test);
    if (isTest && !testEmail.trim()) {
      showToast('err', 'Enter a test email address.');
      return;
    }
    const rowKey = email.trim().toLowerCase();
    setSendingEmail(isTest ? 'test' : rowKey);
    setError(null);
    try {
      const data = await adminInviteDispatchSend({
        email,
        test_mode: isTest,
        test_recipient_email: isTest ? testEmail.trim() : undefined,
      });
      if (data.blocked || data.error) {
        throw new Error(data.error || 'Send failed');
      }
      if (isTest) {
        showToast(
          'ok',
          `Test email sent to ${data.delivered_to || testEmail.trim()} (draft from ${email}).`,
        );
      } else {
        showToast('ok', `Sent to ${email}.`);
        const hist = await adminInviteBatchHistory({ recipient_emails: [email] });
        setSendHistory((prev) => ({ ...prev, ...hist.history_by_email }));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Send failed';
      setError(msg);
      showToast('err', msg);
    } finally {
      setSendingEmail(null);
      setTestBusy(false);
    }
  }

  function runTestSend() {
    const source = testSourceEmail.trim();
    if (!source) {
      showToast('err', 'Select a contact to preview the test send.');
      return;
    }
    if (!testEmail.trim()) {
      showToast('err', 'Enter a test email address.');
      return;
    }
    setTestBusy(true);
    void sendOne(source, { test: true });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Long-gap send</h2>
            <p className="mt-1 text-sm text-slate-400">
              Send approved long-gap reconnect emails individually or all at once. Review and
              classify contacts on the dispatch review panel; use test send before production
              outreach.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {rows.length} approved contact{rows.length === 1 ? '' : 's'} ready
              {pendingSendCount !== rows.length
                ? ` (${pendingSendCount} pending send${pendingSendCount === 1 ? '' : 's'})`
                : ''}
              .
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowReview((v) => !v)}
              className="rounded-lg border border-violet-700/60 px-3 py-2 text-sm text-violet-100 hover:border-violet-500"
            >
              {showReview ? 'Hide dispatch review' : 'Open dispatch review'}
            </button>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:border-slate-400 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-md border border-rose-800/60 bg-rose-950/30 px-3 py-2 text-sm text-rose-200 whitespace-pre-wrap">
            {error}
          </p>
        ) : null}

        {bulkSendNotice ? (
          <p className="mt-4 rounded-md border border-cyan-800/60 bg-cyan-950/30 px-3 py-2 text-sm text-cyan-100">
            {bulkSendNotice}
          </p>
        ) : null}

        <div className="mt-5 rounded-lg border border-amber-800/50 bg-amber-950/25 p-4">
          <p className="text-sm font-medium text-amber-100">Test send (recommended first)</p>
          <p className="mt-1 text-xs text-amber-200/80">
            Sends one draft to your test inbox only. The real contact is not emailed and send status
            is not updated for production.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-slate-300">
              <span className="mb-1 block text-xs text-slate-500">Draft from contact</span>
              <select
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                value={testSourceEmail}
                onChange={(e) => {
                  setTestSourceEmail(e.target.value);
                  setSelectedEmail(e.target.value);
                }}
              >
                {rows.map((row) => (
                  <option key={row.email} value={row.email}>
                    {row.name || row.email}
                    {row.dp_label ? ` (${row.dp_label})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-slate-300">
              <span className="mb-1 block text-xs text-slate-500">Test recipient email</span>
              <input
                type="email"
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                placeholder="daveed@bridgit.io"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </label>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={testMode}
              onChange={(e) => setTestMode(e.target.checked)}
            />
            Test mode (send to test address only)
          </label>
          <button
            type="button"
            disabled={testBusy || !testMode || !testEmail.trim() || !testSourceEmail}
            onClick={runTestSend}
            className="mt-3 rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {testBusy || sendingEmail === 'test' ? 'Sending test…' : 'Send test email'}
          </button>
        </div>
      </div>

      {showReview ? (
        <AdminInviteLongGapDispatch />
      ) : null}

      <div className="rounded-xl border border-rose-800/60 bg-rose-950/20 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Production send</h3>
            <p className="mt-1 text-sm text-slate-300">
              Email all approved contacts with completed drafts who have not been sent yet.
            </p>
            <p className="mt-2 text-xs text-slate-400">
              {pendingSendCount} contact{pendingSendCount === 1 ? '' : 's'} ready to send
              {rows.length !== pendingSendCount
                ? ` (${rows.length} approved total)`
                : ''}
              .
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            <button
              type="button"
              disabled={Boolean(bulkSendDisabledReason)}
              title={bulkSendDisabledReason || undefined}
              onClick={() => void sendAllApproved()}
              className="rounded-lg bg-rose-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-950/40 hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {bulkSendBusy ? 'Sending all…' : `Send all approved (${pendingSendCount})`}
            </button>
            {retryAvailable > 0 ? (
              <button
                type="button"
                disabled={Boolean(retryFailedDisabledReason)}
                title={retryFailedDisabledReason || undefined}
                onClick={() => void retryFailedOnly()}
                className="rounded-lg border border-amber-600/80 bg-amber-950/40 px-5 py-2.5 text-sm font-medium text-amber-100 hover:border-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {bulkSendBusy ? 'Retrying…' : `Retry failed (${retryAvailable})`}
              </button>
            ) : null}
            {bulkSendDisabledReason ? (
              <p className="max-w-xs text-xs text-amber-200/90 sm:text-right">
                {bulkSendDisabledReason}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-base font-semibold text-white">Approved contacts</h3>
            <input
              type="search"
              placeholder="Filter by name, email, DP…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full sm:w-64 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-slate-400">Loading…</p>
          ) : filteredRows.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">No approved contacts match.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-800">
              {filteredRows.map((row) => {
                const status = sendStatusForRow(row.email, sendHistory);
                const isSelected = row.email === selectedEmail;
                const rowBusy = sendingEmail === row.email.trim().toLowerCase();
                return (
                  <li
                    key={row.email}
                    className={`flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between ${
                      isSelected ? 'bg-cyan-950/20 -mx-2 px-2 rounded-lg' : ''
                    }`}
                  >
                    <button
                      type="button"
                      className="min-w-0 text-left"
                      onClick={() => setSelectedEmail(row.email)}
                    >
                      <p className="font-medium text-white truncate">
                        {row.name || row.email}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{row.email}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        {row.dp_label ? (
                          <span className="rounded bg-violet-900/50 px-2 py-0.5 text-violet-200">
                            {row.dp_label}
                          </span>
                        ) : (
                          <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-400">
                            No DP
                          </span>
                        )}
                        <span
                          className={
                            status.tone === 'sent'
                              ? 'text-emerald-300'
                              : status.tone === 'error'
                                ? 'text-amber-300'
                                : 'text-slate-500'
                          }
                        >
                          {status.label}
                        </span>
                        {!rowDraftReady(row) ? (
                          <span className="text-amber-400">Draft missing</span>
                        ) : null}
                      </div>
                    </button>
                    <button
                      type="button"
                      disabled={rowBusy || !rowDraftReady(row) || testMode}
                      title={
                        testMode
                          ? 'Turn off test mode to send to real contacts'
                          : !rowDraftReady(row)
                            ? 'Draft not ready'
                            : undefined
                      }
                      onClick={() => void sendOne(row.email)}
                      className="shrink-0 rounded-lg bg-cyan-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
                    >
                      {rowBusy ? 'Sending…' : 'Send'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {testMode ? (
            <p className="mt-4 text-xs text-amber-200/80">
              Production Send is disabled while test mode is on. Uncheck test mode to send to real
              contacts.
            </p>
          ) : null}
        </section>

        <aside className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <h3 className="text-base font-semibold text-white">Template and preview</h3>
          <TemplatePreview
            template={template}
            subject={subject}
            selectedRow={selectedRow}
            catalog={catalog}
          />
        </aside>
      </div>
      <DpDialogHost />
    </div>
  );
}
