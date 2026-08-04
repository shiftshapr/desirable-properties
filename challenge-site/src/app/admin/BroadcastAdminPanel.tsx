'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BROADCAST_FONT_OPTIONS } from '@/lib/dp-broadcast-send';

const BroadcastRichEditor = dynamic(() => import('@/components/BroadcastRichEditor'), {
  ssr: false,
  loading: () => (
    <div className="min-h-[220px] animate-pulse rounded-md border border-slate-700 bg-slate-950" />
  ),
});

type AudienceRow = {
  key: string;
  userId: string | null;
  userName: string | null;
  email: string | null;
  workgroups: string[];
};

type WorkgroupRow = {
  id: string;
  name: string;
  slug: string;
  acronym: string;
  memberCount: number;
  memberKeys: string[];
};

type LogEntry = {
  id: string;
  subject: string;
  sentAt: string;
  sentBy: string | null;
  recipientCount: number;
  successCount: number;
  failureCount: number;
  testMode: boolean;
  availableInArchive: boolean;
};

type RecipientView = 'members' | 'workgroups';

const DEFAULT_HTML =
  '<p>Hello {name},</p><p>Thank you for joining the Desirable Properties challenge.</p>';

export default function BroadcastAdminPanel() {
  const [audience, setAudience] = useState<AudienceRow[]>([]);
  const [workgroups, setWorkgroups] = useState<WorkgroupRow[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [fontId, setFontId] = useState('default');
  const [testMode, setTestMode] = useState(true);
  const [testEmail, setTestEmail] = useState('');
  const [availableInArchive, setAvailableInArchive] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedWorkgroups, setSelectedWorkgroups] = useState<Set<string>>(new Set());
  const [recipientView, setRecipientView] = useState<RecipientView>('workgroups');
  const [memberSearch, setMemberSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [audRes, wgRes, logRes] = await Promise.all([
        fetch('/api/admin/broadcast?view=audience', { credentials: 'include' }),
        fetch('/api/admin/broadcast?view=workgroups', { credentials: 'include' }),
        fetch('/api/admin/broadcast?view=log', { credentials: 'include' }),
      ]);
      const audData = await audRes.json();
      const wgData = await wgRes.json();
      const logData = await logRes.json();
      if (!audRes.ok || !audData.ok) throw new Error(audData.message || 'Could not load audience');
      setAudience(audData.audience || []);
      setWorkgroups(wgData.workgroups || []);
      setLog(logData.entries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return audience;
    return audience.filter((row) => {
      const hay = [row.userName, row.userId, row.email, ...row.workgroups]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [audience, memberSearch]);

  const workgroupMemberKeys = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const wg of workgroups) {
      map.set(wg.id, new Set(wg.memberKeys));
    }
    return map;
  }, [workgroups]);

  const effectiveSelected = useMemo(() => {
    const keys = new Set(selected);
    for (const wgId of selectedWorkgroups) {
      const memberKeys = workgroupMemberKeys.get(wgId);
      if (memberKeys) {
        for (const key of memberKeys) keys.add(key);
      }
    }
    return keys;
  }, [selected, selectedWorkgroups, workgroupMemberKeys]);

  function toggleMember(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleWorkgroup(wgId: string) {
    setSelectedWorkgroups((prev) => {
      const next = new Set(prev);
      if (next.has(wgId)) next.delete(wgId);
      else next.add(wgId);
      return next;
    });
  }

  function insertMergeTag(tag: string) {
    setHtml((prev) => `${prev}${prev.endsWith('>') ? '' : ' '}${tag}`);
  }

  async function runPreview() {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview', html, fontId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error('Preview failed');
      setPreviewHtml(data.html);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setBusy(false);
    }
  }

  async function sendBroadcast() {
    setBusy(true);
    setFlash(null);
    setError(null);
    try {
      if (!testMode && effectiveSelected.size === 0) {
        throw new Error('Select at least one recipient or workgroup.');
      }

      const recipientKeys = testMode ? undefined : [...effectiveSelected];

      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          html,
          fontId,
          testMode,
          testEmail: testMode ? testEmail : undefined,
          recipientKeys,
          availableInArchive: testMode ? false : availableInArchive,
          audienceFilter: {
            memberCount: selected.size,
            workgroupCount: selectedWorkgroups.size,
            recipientView,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Send failed');
      setFlash(
        testMode
          ? `Test broadcast sent (${data.successCount}/${data.recipientCount}).`
          : `Broadcast sent (${data.successCount}/${data.recipientCount} succeeded).${
              data.availableInArchive ? ' Added to participant archive.' : ''
            }`,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {flash ? (
        <p className="rounded-md border border-emerald-700/50 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
          {flash}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-rose-700/50 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-xl font-semibold text-white">Compose broadcast</h2>
          <p className="mt-2 text-sm text-slate-400">
            Rich email to workgroup participants. Merge tags: {'{name}'}, {'{userName}'}, {'{workgroups}'}.
            Unsubscribe links are appended automatically.
          </p>

          <div className="mt-4 grid gap-3">
            <input
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <label className="text-sm text-slate-300">
              Body font
              <select
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                value={fontId}
                onChange={(e) => setFontId(e.target.value)}
              >
                {BROADCAST_FONT_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <BroadcastRichEditor value={html} onChange={setHtml} disabled={busy} />
            <p className="text-xs text-slate-500">
              Insert images with the toolbar image button (PNG, JPEG, or GIF, max 5 MB).
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-slate-400">
              <span>Merge tags:</span>
              {['{name}', '{userName}', '{workgroups}'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => insertMergeTag(tag)}
                  className="rounded border border-slate-700 px-2 py-0.5 font-mono text-cyan-300 hover:bg-slate-800"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={testMode} onChange={(e) => setTestMode(e.target.checked)} />
            Test mode (send to one address only)
          </label>
          {testMode ? (
            <input
              className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              placeholder="Test email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
          ) : (
            <label className="mt-4 flex items-start gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={availableInArchive}
                onChange={(e) => setAvailableInArchive(e.target.checked)}
                className="mt-1"
              />
              <span>
                Available in archive
                <span className="mt-1 block text-xs text-slate-500">
                  When checked, this email appears in Activity → Updates for workgroup participants.
                </span>
              </span>
            </label>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void runPreview()}
              className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200"
            >
              Preview
            </button>
            <button
              type="button"
              disabled={
                busy ||
                !subject.trim() ||
                !html.trim() ||
                (testMode && !testEmail.trim()) ||
                (!testMode && effectiveSelected.size === 0)
              }
              onClick={() => void sendBroadcast()}
              className="rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
            >
              Send broadcast
            </button>
          </div>

          {previewHtml ? (
            <div
              className="prose prose-invert mt-4 max-w-none rounded-md border border-slate-800 bg-slate-950 p-4 text-sm [&_img]:max-w-full"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          ) : null}
        </section>

        {!testMode ? (
          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">
                Recipients ({effectiveSelected.size} selected)
              </h3>
              <div className="flex rounded-md border border-slate-700 p-0.5 text-sm">
                <button
                  type="button"
                  className={`rounded px-3 py-1.5 ${
                    recipientView === 'workgroups' ? 'bg-cyan-700 text-white' : 'text-slate-300'
                  }`}
                  onClick={() => setRecipientView('workgroups')}
                >
                  By workgroup
                </button>
                <button
                  type="button"
                  className={`rounded px-3 py-1.5 ${
                    recipientView === 'members' ? 'bg-cyan-700 text-white' : 'text-slate-300'
                  }`}
                  onClick={() => setRecipientView('members')}
                >
                  By members
                </button>
              </div>
            </div>

            {loading ? (
              <p className="mt-4 text-sm text-slate-400">Loading audience…</p>
            ) : recipientView === 'workgroups' ? (
              workgroups.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">No workgroups loaded from Gov Hub.</p>
              ) : (
                <ul className="mt-4 max-h-[28rem] overflow-y-auto divide-y divide-slate-800 rounded-lg border border-slate-800">
                  {workgroups.map((wg) => (
                    <li key={wg.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedWorkgroups.has(wg.id)}
                        onChange={() => toggleWorkgroup(wg.id)}
                      />
                      <div>
                        <p className="font-medium text-white">{wg.name}</p>
                        <p className="text-xs text-slate-500">
                          {wg.memberCount} member{wg.memberCount === 1 ? '' : 's'}
                          {wg.acronym ? ` · ${wg.acronym}` : ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            ) : audience.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No audience rows loaded from Gov Hub signups.</p>
            ) : (
              <>
                <input
                  className="mt-4 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  placeholder="Search name, email, workgroup…"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                />
                <ul className="mt-4 max-h-[24rem] overflow-y-auto divide-y divide-slate-800 rounded-lg border border-slate-800">
                  {filteredMembers.map((row) => (
                    <li key={row.key} className="flex items-center gap-3 px-4 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selected.has(row.key)}
                        onChange={() => toggleMember(row.key)}
                      />
                      <div>
                        <p className="text-white">{row.userName || row.userId || row.key}</p>
                        <p className="text-xs text-slate-500">
                          {row.workgroups.join(', ') || 'No workgroups'}
                          {row.email ? ` · ${row.email}` : ' · no email on file'}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        ) : null}
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <h3 className="text-lg font-semibold text-white">Send history</h3>
        {log.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No broadcasts sent yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-800 rounded-lg border border-slate-800">
            {log.map((entry) => (
              <li key={entry.id} className="px-4 py-3 text-sm">
                <p className="font-medium text-white">{entry.subject}</p>
                <p className="text-slate-400">
                  {new Date(entry.sentAt).toLocaleString()} · {entry.successCount}/{entry.recipientCount}{' '}
                  sent
                  {entry.testMode ? ' · test' : ''}
                  {entry.availableInArchive ? ' · archived' : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
