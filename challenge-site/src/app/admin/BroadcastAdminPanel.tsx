'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAdminToast } from '@/components/AdminToastHost';
import BroadcastConfirmDialog from '@/components/BroadcastConfirmDialog';
import BroadcastComposeAssist from '@/components/admin/BroadcastComposeAssist';
import BroadcastRecipientList from '@/components/BroadcastRecipientList';
import {
  BROADCAST_COHORTS,
  cohortUsesDpChallengeFilters,
  type BroadcastCohortKey,
} from '@/data/dp-broadcast-cohorts';
import { applyBroadcastCohortFilter } from '@/lib/dp-broadcast-cohort-recipients';
import {
  clearBroadcastComposeAfterSend,
  clearBroadcastDraft,
  fixBroadcastEmDashes,
  isBroadcastDraftEmpty,
  readBroadcastDraft,
  writeBroadcastDraft,
  type BroadcastDraftInput,
} from '@/lib/dp-broadcast-draft';
import { BROADCAST_FONT_OPTIONS } from '@/lib/dp-broadcast-send';
import {
  formatBroadcastSendMessage,
  type BroadcastRecipientResult,
} from '@/lib/dp-broadcast-result';
import {
  broadcastAudienceMatchesFilters,
  type BroadcastDpScope,
  type BroadcastPatchFilter,
} from '@/lib/dp-broadcast-audience-filter';
import { extractDpId } from '@/lib/govhub';

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
  hasSubmittedPatch?: boolean;
  patchCount?: number;
  patchDpIds?: string[];
};

type WorkgroupRow = {
  id: string;
  name: string;
  slug: string;
  acronym: string;
  memberCount: number;
  memberKeys: string[];
  members: Array<{ key: string; userName: string | null }>;
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

type ConfirmState = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  warning: boolean;
  onConfirm: () => void;
};

const DEFAULT_HTML =
  '<p>Hello {name},</p><p>Thank you for joining the Desirable Properties challenge.</p>';

function initFromDraft() {
  const draft = readBroadcastDraft();
  if (!draft) {
    return {
      subject: '',
      html: DEFAULT_HTML,
      fontId: 'default',
      testMode: true,
      testEmail: '',
      availableInArchive: false,
      recipientView: 'workgroups' as RecipientView,
      selected: new Set<string>(),
      selectedWorkgroups: new Set<string>(),
      memberSearch: '',
      cohortFilter: 'all' as BroadcastCohortKey,
      patchFilter: 'all' as BroadcastPatchFilter,
      dpScope: 'all' as BroadcastDpScope,
      dpId: '',
      draftRestored: false,
    };
  }
  return {
    subject: draft.subject,
    html: draft.html || DEFAULT_HTML,
    fontId: draft.fontId,
    testMode: draft.testMode,
    testEmail: draft.testEmail,
    availableInArchive: draft.availableInArchive,
    recipientView: draft.recipientView,
    selected: new Set(draft.selected),
    selectedWorkgroups: new Set(draft.selectedWorkgroups),
    memberSearch: draft.memberSearch,
    cohortFilter: draft.cohortFilter,
    patchFilter: draft.patchFilter,
    dpScope: draft.dpScope,
    dpId: draft.dpId,
    draftRestored: true,
  };
}

export default function BroadcastAdminPanel() {
  const initial = useMemo(() => initFromDraft(), []);
  const { showToast } = useAdminToast();
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef<BroadcastDraftInput>({
    subject: initial.subject,
    html: initial.html,
    fontId: initial.fontId,
    testMode: initial.testMode,
    testEmail: initial.testEmail,
    availableInArchive: initial.availableInArchive,
    recipientView: initial.recipientView,
    selected: [...initial.selected],
    selectedWorkgroups: [...initial.selectedWorkgroups],
    memberSearch: initial.memberSearch,
    cohortFilter: initial.cohortFilter,
    patchFilter: initial.patchFilter,
    dpScope: initial.dpScope,
    dpId: initial.dpId,
  });

  const [audience, setAudience] = useState<AudienceRow[]>([]);
  const [workgroups, setWorkgroups] = useState<WorkgroupRow[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [subject, setSubject] = useState(initial.subject);
  const [html, setHtml] = useState(initial.html);
  const [fontId, setFontId] = useState(initial.fontId);
  const [testMode, setTestMode] = useState(initial.testMode);
  const [testEmail, setTestEmail] = useState(initial.testEmail);
  const [availableInArchive, setAvailableInArchive] = useState(initial.availableInArchive);
  const [selected, setSelected] = useState<Set<string>>(initial.selected);
  const [selectedWorkgroups, setSelectedWorkgroups] = useState<Set<string>>(initial.selectedWorkgroups);
  const [recipientView, setRecipientView] = useState<RecipientView>(initial.recipientView);
  const [memberSearch, setMemberSearch] = useState(initial.memberSearch);
  const [patchFilter, setPatchFilter] = useState<BroadcastPatchFilter>(initial.patchFilter);
  const [dpScope, setDpScope] = useState<BroadcastDpScope>(initial.dpScope);
  const [dpId, setDpId] = useState(initial.dpId);
  const [cohortFilter, setCohortFilter] = useState<BroadcastCohortKey>(initial.cohortFilter);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{ kind: 'ok' | 'warn' | 'err'; message: string } | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [expandedWorkgroups, setExpandedWorkgroups] = useState<Set<string>>(new Set());
  const [highlightMemberKey, setHighlightMemberKey] = useState<string | null>(null);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  const scheduleDraftSave = useCallback(() => {
    const draft: BroadcastDraftInput = {
      subject,
      html,
      fontId,
      testMode,
      testEmail,
      availableInArchive,
      recipientView,
      selected: [...selected],
      selectedWorkgroups: [...selectedWorkgroups],
      memberSearch,
      cohortFilter,
      patchFilter,
      dpScope,
      dpId,
    };
    draftRef.current = draft;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      writeBroadcastDraft(draft);
    }, 400);
  }, [
    subject,
    html,
    fontId,
    testMode,
    testEmail,
    availableInArchive,
    recipientView,
    selected,
    selectedWorkgroups,
    memberSearch,
    cohortFilter,
    patchFilter,
    dpScope,
    dpId,
  ]);

  useEffect(() => {
    scheduleDraftSave();
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [scheduleDraftSave]);

  useEffect(() => {
    const flush = () => writeBroadcastDraft(draftRef.current);
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);

  useEffect(() => {
    if (initial.draftRestored) {
      showToast('info', 'Restored your saved broadcast draft.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
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
      const msg = err instanceof Error ? err.message : 'Load failed';
      setFlash({ kind: 'err', message: msg });
      showToast('err', msg);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const cohortAudience = useMemo(
    () => applyBroadcastCohortFilter(audience, cohortFilter),
    [audience, cohortFilter],
  );

  const dpFiltersActive = cohortUsesDpChallengeFilters(cohortFilter);

  const filteredMembers = useMemo(() => {
    const scoped = cohortAudience.filter((row) =>
      broadcastAudienceMatchesFilters(row, {
        cohort: cohortFilter,
        patchFilter,
        dpScope,
        dpId: dpScope === 'specific' ? dpId : null,
      }),
    );
    const q = memberSearch.trim().toLowerCase();
    if (!q) return scoped;
    return scoped.filter((row) => {
      const hay = [row.userName, row.userId, row.email, ...row.workgroups]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [cohortAudience, memberSearch, cohortFilter, patchFilter, dpScope, dpId]);

  const dpOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const wg of workgroups) {
      const id = extractDpId(wg.name);
      if (id) map.set(id, wg.name);
    }
    return [...map.entries()].sort(
      (a, b) => Number(a[0].replace(/^DP/i, '')) - Number(b[0].replace(/^DP/i, '')),
    );
  }, [workgroups]);

  const filteredWorkgroups = useMemo(() => {
    if (!dpFiltersActive) return workgroups;
    if (dpScope !== 'specific' || !dpId) return workgroups;
    return workgroups.filter((wg) => extractDpId(wg.name) === dpId);
  }, [workgroups, dpScope, dpId, dpFiltersActive]);

  const cohortCounts = useMemo(() => {
  const counts: Record<BroadcastCohortKey, number> = {
    all: audience.length,
    cfi1_pci: applyBroadcastCohortFilter(audience, 'cfi1_pci').length,
    cfi1_zoom: applyBroadcastCohortFilter(audience, 'cfi1_zoom').length,
    cfi2_submitters: applyBroadcastCohortFilter(audience, 'cfi2_submitters').length,
    isoc_nevada: applyBroadcastCohortFilter(audience, 'isoc_nevada').length,
    dp_challenge: audience.length,
  };
    return counts;
  }, [audience]);

  const workgroupMemberKeys = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const wg of workgroups) {
      map.set(wg.id, new Set(wg.memberKeys));
    }
    return map;
  }, [workgroups]);

  const workgroupIdByLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const wg of workgroups) {
      map.set(wg.name, wg.id);
      if (wg.acronym) map.set(wg.acronym, wg.id);
    }
    return map;
  }, [workgroups]);

  const workgroupDerivedKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const wgId of selectedWorkgroups) {
      const memberKeys = workgroupMemberKeys.get(wgId);
      if (memberKeys) {
        for (const key of memberKeys) keys.add(key);
      }
    }
    return keys;
  }, [selectedWorkgroups, workgroupMemberKeys]);

  const effectiveSelected = useMemo(() => {
    const keys = new Set(selected);
    for (const key of workgroupDerivedKeys) keys.add(key);
    return keys;
  }, [selected, workgroupDerivedKeys]);

  const selectedAudienceRows = useMemo(() => {
    const keys = [...effectiveSelected];
    return keys
      .map((key) => cohortAudience.find((row) => row.key === key) || audience.find((row) => row.key === key))
      .filter((row): row is AudienceRow => Boolean(row));
  }, [audience, cohortAudience, effectiveSelected]);

  const selectedMissingEmailCount = useMemo(
    () => selectedAudienceRows.filter((row) => !row.email).length,
    [selectedAudienceRows],
  );

  const selectionLabel = useMemo(() => {
    const count = effectiveSelected.size;
    const crossTabNote = ' Selections from both tabs are combined.';
    if (count === 0) {
      return { text: 'No recipients selected.', warn: true };
    }
    const missingNote =
      !testMode && selectedMissingEmailCount > 0
        ? ` ${selectedMissingEmailCount} of ${count} selected have no email on file and will be skipped.`
        : '';
    const wgCount = selectedWorkgroups.size;
    const memberCount = selected.size;
    const wgPeople = workgroupDerivedKeys.size;
    if (wgCount > 0 && memberCount > 0) {
      return {
        text: `${count} recipient${count === 1 ? '' : 's'} total (${wgCount} workgroup${wgCount === 1 ? '' : 's'} · ${wgPeople} people, ${memberCount} individual${memberCount === 1 ? '' : 's'}).${crossTabNote}${missingNote}`,
        warn: selectedMissingEmailCount > 0,
      };
    }
    if (wgCount > 0) {
      return {
        text: `${count} recipient${count === 1 ? '' : 's'} from ${wgCount} workgroup${wgCount === 1 ? '' : 's'}.${crossTabNote}${missingNote}`,
        warn: selectedMissingEmailCount > 0,
      };
    }
    return {
      text: `${count} individual recipient${count === 1 ? '' : 's'} selected.${crossTabNote}${missingNote}`,
      warn: selectedMissingEmailCount > 0,
    };
  }, [
    effectiveSelected.size,
    selected.size,
    selectedWorkgroups.size,
    selectedMissingEmailCount,
    testMode,
    workgroupDerivedKeys.size,
  ]);

  function askConfirm(opts: Omit<ConfirmState, 'onConfirm'> & { onConfirm: () => void | Promise<void> }) {
    setConfirm({
      ...opts,
      onConfirm: () => {
        setConfirm(null);
        void opts.onConfirm();
      },
    });
  }

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

  function scrollToRecipient(id: string) {
    requestAnimationFrame(() => {
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 50);
    });
  }

  function navigateToMember(key: string, userName: string | null) {
    setRecipientView('members');
    setSelected((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    setMemberSearch(userName?.trim() || '');
    setHighlightMemberKey(key);
    scrollToRecipient(`member-${key}`);
    window.setTimeout(() => setHighlightMemberKey(null), 2000);
  }

  function navigateToWorkgroup(wgId: string) {
    setRecipientView('workgroups');
    setSelectedWorkgroups((prev) => {
      if (prev.has(wgId)) return prev;
      const next = new Set(prev);
      next.add(wgId);
      return next;
    });
    setExpandedWorkgroups((prev) => new Set(prev).add(wgId));
    scrollToRecipient(`workgroup-${wgId}`);
  }

  function toggleAllVisibleMembers(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const row of filteredMembers) {
        if (checked) next.add(row.key);
        else next.delete(row.key);
      }
      return next;
    });
  }

  function insertMergeTag(tag: string) {
    setHtml((prev) => `${prev}${prev.endsWith('>') ? '' : ' '}${tag}`);
  }

  function fixDashes() {
    const { subject: nextSubject, html: nextHtml, count } = fixBroadcastEmDashes(subject, html);
    setSubject(nextSubject);
    setHtml(nextHtml);
    const msg = count
      ? `Replaced ${count} em dash${count === 1 ? '' : 'es'}.`
      : 'No em dashes found.';
    showToast(count ? 'ok' : 'info', msg);
  }

  function applyBroadcastTemplate(entry: { subject: string; html: string; fontId?: string }, logId: string) {
    setSubject(entry.subject || '');
    setHtml(entry.html || DEFAULT_HTML);
    if (entry.fontId) setFontId(entry.fontId);
    setPreviewHtml('');
    setSelectedLogId(logId);
    showToast('ok', 'Template loaded.');
    document.getElementById('broadcast-compose')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function fetchAndApplyBroadcastTemplate(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/broadcast?id=${encodeURIComponent(id)}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.ok || !data.entry) {
        throw new Error(data.error || data.message || 'Broadcast not found');
      }
      const entry = data.entry as { subject?: string; html?: string; fontId?: string };
      if (!String(entry.html || '').trim()) {
        showToast('err', 'This send has no saved body template.');
        return;
      }
      applyBroadcastTemplate(
        {
          subject: String(entry.subject || ''),
          html: String(entry.html || ''),
          fontId: entry.fontId ? String(entry.fontId) : undefined,
        },
        id,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not load template';
      showToast('err', msg);
    } finally {
      setBusy(false);
    }
  }

  function loadBroadcastAsTemplate(id: string) {
    if (busy) return;
    const hasContent = !isBroadcastDraftEmpty(subject, html);
    if (!hasContent) {
      void fetchAndApplyBroadcastTemplate(id);
      return;
    }
    askConfirm({
      title: 'Load template',
      message: 'Replace the current subject and body with this broadcast?',
      confirmLabel: 'Load template',
      cancelLabel: 'Keep editing',
      warning: true,
      onConfirm: () => void fetchAndApplyBroadcastTemplate(id),
    });
  }

  function clearCompose() {
    const hasContent = !isBroadcastDraftEmpty(subject, html);
    const doClear = () => {
      setSubject('');
      setHtml('<p><br></p>');
      setFontId('default');
      setTestMode(true);
      setTestEmail('');
      setAvailableInArchive(false);
      setSelected(new Set());
      setSelectedWorkgroups(new Set());
      setMemberSearch('');
      setCohortFilter('all');
      setPatchFilter('all');
      setDpScope('all');
      setDpId('');
      setPreviewHtml('');
      setFlash(null);
      setSelectedLogId(null);
      clearBroadcastDraft();
      showToast('ok', 'Compose cleared.');
    };
    if (!hasContent) {
      doClear();
      return;
    }
    askConfirm({
      title: 'Clear compose',
      message: 'Discard the current subject and body?',
      confirmLabel: 'Clear',
      cancelLabel: 'Keep editing',
      warning: true,
      onConfirm: doClear,
    });
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
      if (!res.ok || !data.ok) throw new Error(data.error || 'Preview failed');
      setPreviewHtml(data.html);
      showToast('ok', 'Preview ready.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Preview failed';
      setFlash({ kind: 'err', message: msg });
      showToast('err', msg);
    } finally {
      setBusy(false);
    }
  }

  async function executeSend() {
    setBusy(true);
    setFlash(null);
    try {
      if (!testMode && effectiveSelected.size === 0) {
        throw new Error('Select at least one recipient or workgroup.');
      }
      if (testMode && !testEmail.trim()) {
        throw new Error('Enter a test email address.');
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
            cohort: cohortFilter,
            memberCount: selected.size,
            workgroupCount: selectedWorkgroups.size,
            recipientView,
            patchFilter: dpFiltersActive ? patchFilter : undefined,
            dpScope: dpFiltersActive ? dpScope : undefined,
            dpId: dpFiltersActive && dpScope === 'specific' ? dpId : undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Send failed');

      const failures = (Array.isArray(data.failures) ? data.failures : []) as BroadcastRecipientResult[];
      const okMsg = formatBroadcastSendMessage({
        successCount: data.successCount,
        recipientCount: data.recipientCount,
        failureCount: data.failureCount,
        failures,
        testMode: data.testMode,
        availableInArchive: data.availableInArchive,
      });
      const flashKind =
        !data.testMode && data.failureCount > 0
          ? data.successCount > 0
            ? 'warn'
            : 'err'
          : 'ok';
      setFlash({ kind: flashKind, message: okMsg });
      showToast(flashKind === 'err' ? 'err' : flashKind === 'warn' ? 'info' : 'ok', okMsg);
      if (!data.testMode) {
        const composeAfterSend: BroadcastDraftInput = {
          subject: '',
          html: '',
          fontId: 'default',
          testMode,
          testEmail,
          availableInArchive: false,
          recipientView,
          selected: [],
          selectedWorkgroups: [],
          memberSearch,
          cohortFilter,
          patchFilter,
          dpScope,
          dpId,
        };
        clearBroadcastComposeAfterSend(composeAfterSend);
        setSubject('');
        setHtml('<p><br></p>');
        setFontId('default');
        setAvailableInArchive(false);
        setSelected(new Set());
        setSelectedWorkgroups(new Set());
      }
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Send failed';
      setFlash({ kind: 'err', message: msg });
      showToast('err', msg);
    } finally {
      setBusy(false);
    }
  }

  function sendBroadcast() {
    if (!subject.trim() || !html.trim()) {
      const msg = 'Enter a subject and body before sending.';
      setFlash({ kind: 'err', message: msg });
      showToast('err', msg);
      return;
    }

    if (!testMode && effectiveSelected.size === 0) {
      const msg = 'Select at least one recipient or workgroup.';
      setFlash({ kind: 'err', message: msg });
      showToast('err', msg);
      return;
    }

    if (testMode && !testEmail.trim()) {
      const msg = 'Enter a test email address.';
      setFlash({ kind: 'err', message: msg });
      showToast('err', msg);
      return;
    }

    const count = effectiveSelected.size;
    const countLabel =
      count === 0
        ? 'test inbox only'
        : count === 1
          ? '1 selected recipient'
          : `${count} selected recipients`;

    let confirmMsg: string;
    let confirmWarning = false;

    if (testMode) {
      confirmMsg = `Test mode is ON – mail goes to ${testEmail.trim()} only (not to participants). Continue?`;
      confirmWarning = true;
    } else if (selectedMissingEmailCount > 0) {
      confirmMsg = `Send this broadcast to ${countLabel}? ${selectedMissingEmailCount} of ${count} selected have no email on file and will be skipped.${
        availableInArchive
          ? ' Successful sends will appear in Activity → Updates for workgroup participants.'
          : ''
      } This cannot be undone.`;
      confirmWarning = true;
    } else if (availableInArchive) {
      confirmMsg = `Send this broadcast to ${countLabel}? It will also appear in Activity → Updates for workgroup participants. This cannot be undone.`;
    } else {
      confirmMsg = `Send this broadcast to ${countLabel}? Emails go to each recipient's address on file. This cannot be undone.`;
    }

    askConfirm({
      title: testMode ? 'Send test broadcast' : 'Send broadcast',
      message: confirmMsg,
      confirmLabel: 'Send',
      cancelLabel: 'Cancel',
      warning: confirmWarning,
      onConfirm: () => void executeSend(),
    });
  }

  const visibleMembersSelected = filteredMembers.filter((row) => selected.has(row.key)).length;
  const allVisibleMembersSelected =
    filteredMembers.length > 0 && visibleMembersSelected === filteredMembers.length;
  const someVisibleMembersSelected =
    visibleMembersSelected > 0 && visibleMembersSelected < filteredMembers.length;

  return (
    <div className="space-y-6">
      {flash ? (
        <p
          className={`rounded-md border px-4 py-3 text-sm ${
            flash.kind === 'ok'
              ? 'border-emerald-700/50 bg-emerald-950/40 text-emerald-200'
              : flash.kind === 'warn'
                ? 'border-amber-700/50 bg-amber-950/40 text-amber-100'
                : 'border-rose-700/50 bg-rose-950/40 text-rose-200'
          }`}
          role="status"
        >
          {flash.message}
        </p>
      ) : null}

      {testMode ? (
        <p
          className="rounded-md border border-amber-700/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-100"
          role="status"
        >
          <strong>Test mode is ON.</strong> Mail goes to your test address only. Uncheck test mode
          below for production delivery to selected recipients.
        </p>
      ) : (
        <p
          className="rounded-md border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm text-slate-300"
          role="status"
        >
          <strong>Production send.</strong> Mail goes to each selected recipient. Check test mode to
          send to a single test address first.
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <section
          id="broadcast-compose"
          className="rounded-xl border border-slate-800 bg-slate-900/40 p-6"
        >
          <h2 className="text-xl font-semibold text-white">Compose broadcast</h2>
          <p className="mt-2 text-sm text-slate-400">
            Rich email to workgroup participants. Personalization: {'{name}'}, {'{userName}'},{' '}
            {'{profileLink}'}, {'{workgroups}'} (Oxford-comma list with Gov Hub links). Unsubscribe
            links are appended automatically.
          </p>

          <div className="mt-4 grid gap-3">
            <BroadcastComposeAssist
              subject={subject}
              onSubjectChange={setSubject}
              html={html}
              onHtmlChange={setHtml}
              disabled={busy}
            >
              <label className="mt-2 block text-sm text-slate-300">
                Font
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
              <BroadcastRichEditor
                value={html}
                onChange={setHtml}
                disabled={busy}
                onUploadError={(msg) => {
                  showToast('err', msg);
                }}
              />
            </BroadcastComposeAssist>
            <div className="space-y-2">
              <p className="text-xs text-slate-500">
                Insert images with the toolbar image button (up to 25 MB; optimized to WebP ~800px wide for email).
              </p>
              <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-2 text-xs text-slate-400">
                <span>Personalization:</span>
                {[
                  { tag: '{name}', label: 'display name' },
                  { tag: '{userName}', label: 'full name' },
                  { tag: '{profileLink}', label: 'Canopi profile link' },
                  { tag: '{workgroups}', label: 'workgroups' },
                ].map(({ tag, label }) => (
                  <span key={tag} className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => insertMergeTag(tag)}
                      className="rounded border border-slate-700 px-2 py-0.5 font-mono text-cyan-300 hover:bg-slate-800"
                      title={`Insert ${label}`}
                    >
                      {tag}
                    </button>
                    {label}
                  </span>
                ))}
              </div>
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
            <label
              className={`mt-4 flex items-start gap-2 rounded-md border px-3 py-3 text-sm text-slate-300 ${
                availableInArchive ? 'border-cyan-700/50 bg-cyan-950/20' : 'border-transparent'
              }`}
            >
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
                  {testMode
                    ? ' Test sends are never archived – uncheck test mode and send in production.'
                    : ''}
                </span>
              </span>
            </label>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void runPreview()}
              className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
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
              onClick={sendBroadcast}
              className="rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
            >
              {testMode
                ? 'Send test broadcast'
                : effectiveSelected.size === 0
                  ? 'Send broadcast'
                  : effectiveSelected.size === 1
                    ? 'Send to 1 selected'
                    : `Send to ${effectiveSelected.size} selected`}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={fixDashes}
              title="Replace em dashes with en dashes"
              className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              Fix dashes
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={clearCompose}
              title="Discard subject and body"
              className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              Clear
            </button>
          </div>

          {previewHtml ? (
            <div
              className="broadcast-preview-frame mt-4 max-w-none rounded-md border border-slate-800 bg-white p-4 text-sm leading-relaxed text-[#111] [&_h1]:m-0 [&_h2]:m-0 [&_img]:block [&_img]:max-w-full [&_li]:m-0 [&_li]:p-0 [&_ol]:m-0 [&_ol]:pl-6 [&_p]:m-0 [&_p]:p-0 [&_ul]:m-0 [&_ul]:pl-6"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          ) : null}
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white">Recipients</h3>
              <p
                className={`mt-1 text-sm ${selectionLabel.warn ? 'text-amber-300' : 'text-slate-400'}`}
              >
                {selectionLabel.text}
              </p>
            </div>
            <div className="flex rounded-md border border-slate-700 p-0.5 text-sm">
              <button
                type="button"
                className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 ${
                  recipientView === 'workgroups' ? 'bg-cyan-700 text-white' : 'text-slate-300'
                }`}
                onClick={() => setRecipientView('workgroups')}
              >
                By workgroup
                {selectedWorkgroups.size > 0 ? (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${
                      recipientView === 'workgroups'
                        ? 'bg-cyan-900/60 text-cyan-100'
                        : 'bg-slate-800 text-slate-200'
                    }`}
                  >
                    {selectedWorkgroups.size} · {workgroupDerivedKeys.size} people
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 ${
                  recipientView === 'members' ? 'bg-cyan-700 text-white' : 'text-slate-300'
                }`}
                onClick={() => setRecipientView('members')}
              >
                By members
                {selected.size > 0 ? (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${
                      recipientView === 'members'
                        ? 'bg-cyan-900/60 text-cyan-100'
                        : 'bg-slate-800 text-slate-200'
                    }`}
                  >
                    {selected.size}
                  </span>
                ) : null}
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm text-slate-300">
              <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Cohort</span>
              <select
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                value={cohortFilter}
                onChange={(e) => {
                  const next = e.target.value as BroadcastCohortKey;
                  setCohortFilter(next);
                  if (!cohortUsesDpChallengeFilters(next)) {
                    setPatchFilter('all');
                    setDpScope('all');
                    setDpId('');
                  }
                  if (next !== 'all' && next !== 'dp_challenge') {
                    setRecipientView('members');
                  }
                }}
              >
                {BROADCAST_COHORTS.map((cohort) => (
                  <option key={cohort.key} value={cohort.key}>
                    {cohort.label}
                    {cohort.key !== 'all' ? ` (${cohortCounts[cohort.key]})` : ` (${cohortCounts.all})`}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-slate-300">
              <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Patch</span>
              <select
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white disabled:opacity-50"
                value={patchFilter}
                disabled={!dpFiltersActive}
                onChange={(e) => setPatchFilter(e.target.value as BroadcastPatchFilter)}
              >
                <option value="all">Any</option>
                <option value="submitted">Submitted a patch</option>
                <option value="not_submitted">No patch submitted</option>
              </select>
            </label>
            <label className="block text-sm text-slate-300">
              <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">DP</span>
              <select
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white disabled:opacity-50"
                value={dpScope}
                disabled={!dpFiltersActive}
                onChange={(e) => {
                  const next = e.target.value as BroadcastDpScope;
                  setDpScope(next);
                  if (next === 'all') setDpId('');
                }}
              >
                <option value="all">All DPs</option>
                <option value="specific">Specific DP</option>
              </select>
            </label>
            {dpFiltersActive && dpScope === 'specific' ? (
              <label className="block text-sm text-slate-300">
                <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">DP workgroup</span>
                <select
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  value={dpId}
                  onChange={(e) => setDpId(e.target.value)}
                >
                  <option value="">Select DP…</option>
                  {dpOptions.map(([id, label]) => (
                    <option key={id} value={id}>
                      {id} · {label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {BROADCAST_COHORTS.find((c) => c.key === cohortFilter)?.description}
            {dpFiltersActive
              ? ' Patch and DP filters apply to the member list and narrow workgroups when a specific DP is selected. Patch status uses Gov Hub proposal authors.'
              : ' Select DP Challenge to enable Patch and DP filters.'}
            {dpFiltersActive && dpScope === 'specific' && dpId ? ` Filtering for ${dpId}.` : ''}
          </p>

          {loading ? (
            <p className="mt-4 text-sm text-slate-400">Loading audience…</p>
          ) : recipientView === 'workgroups' ? (
            filteredWorkgroups.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No workgroups match the current DP filter.</p>
            ) : (
              <ul className="mt-4 max-h-[28rem] overflow-y-auto divide-y divide-slate-800 rounded-lg border border-slate-800">
                {filteredWorkgroups.map((wg) => (
                  <li key={wg.id} id={`workgroup-${wg.id}`} className="text-sm">
                    <details
                      className="group"
                      open={expandedWorkgroups.has(wg.id)}
                      onToggle={(e) => {
                        const open = (e.currentTarget as HTMLDetailsElement).open;
                        setExpandedWorkgroups((prev) => {
                          const next = new Set(prev);
                          if (open) next.add(wg.id);
                          else next.delete(wg.id);
                          return next;
                        });
                      }}
                    >
                      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
                        <input
                          type="checkbox"
                          checked={selectedWorkgroups.has(wg.id)}
                          onChange={() => toggleWorkgroup(wg.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-white">{wg.name}</p>
                          <p className="text-xs text-slate-500">
                            {wg.memberCount} member{wg.memberCount === 1 ? '' : 's'}
                            {wg.acronym ? ` · ${wg.acronym}` : ''}
                            {wg.members.length ? ' · click to expand' : ''}
                          </p>
                        </div>
                      </summary>
                      {wg.members.length ? (
                        <ul className="space-y-1 border-t border-slate-800/80 px-4 py-2 pb-3 pl-11">
                          {wg.members.map((member) => (
                            <li key={member.key} className="text-xs text-slate-400">
                              <button
                                type="button"
                                onClick={() => navigateToMember(member.key, member.userName)}
                                className="text-left text-slate-400 hover:text-cyan-300 hover:underline"
                              >
                                {member.userName || member.key}
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="border-t border-slate-800/80 px-4 py-2 pl-11 text-xs text-slate-500">
                          No members listed.
                        </p>
                      )}
                    </details>
                  </li>
                ))}
              </ul>
            )
          ) : cohortFilter === 'cfi1_zoom' && cohortCounts.cfi1_zoom === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              CFI#1 ZOOM attendee list is TBD — no recipients yet.
            </p>
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
              <BroadcastRecipientList
                rows={filteredMembers}
                selected={selected}
                onToggle={toggleMember}
                onToggleAllVisible={toggleAllVisibleMembers}
                allVisibleSelected={allVisibleMembersSelected}
                someVisibleSelected={someVisibleMembersSelected}
                highlightKey={highlightMemberKey}
                workgroupIdByLabel={workgroupIdByLabel}
                onNavigateWorkgroup={navigateToWorkgroup}
                emptyMessage="No recipients match the current cohort and filters."
              />
            </>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <h3 className="text-lg font-semibold text-white">Send history</h3>
        {log.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No broadcasts sent yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-800 rounded-lg border border-slate-800">
            {log.map((entry) => (
              <li
                key={entry.id}
                className={`px-4 py-3 text-sm transition-colors ${
                  selectedLogId === entry.id ? 'bg-cyan-950/30' : 'hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => loadBroadcastAsTemplate(entry.id)}
                    className="min-w-0 flex-1 rounded-md text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 disabled:opacity-50"
                    aria-label={`Load ${entry.subject || 'broadcast'} as template`}
                  >
                    <p className="font-medium text-white">{entry.subject}</p>
                    <p className="text-slate-400">
                      {new Date(entry.sentAt).toLocaleString()} · {entry.successCount}/
                      {entry.recipientCount} sent
                      {entry.failureCount > 0
                        ? ` · ${entry.failureCount} failed`
                        : ''}
                      {entry.testMode ? ' · test' : ''}
                      {entry.availableInArchive ? ' · archived' : ''}
                    </p>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => loadBroadcastAsTemplate(entry.id)}
                    className="shrink-0 rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                  >
                    Use as template
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <BroadcastConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title || ''}
        message={confirm?.message || ''}
        confirmLabel={confirm?.confirmLabel}
        cancelLabel={confirm?.cancelLabel}
        warning={confirm?.warning}
        onConfirm={() => confirm?.onConfirm()}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
