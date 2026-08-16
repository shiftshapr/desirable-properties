'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdminInviteListFilters, {
  AdminInviteCompactListRow,
} from '@/components/admin/AdminInviteListFilters';
import {
  adminInviteHideContact,
  adminInviteIngestZoho,
  adminInvitePathwayApply,
  adminInvitePathwaySearch,
  adminInvitePathwayUrl,
  adminInvitePathwayZoho,
  adminInviteSendRecords,
  type AdminInviteSendRecord,
  type InvitePathwayApplyPayload,
  type MessageStrategy,
  type OutreachSelectionReason,
  type SearchHitCandidate,
  type UrlAuthorCandidate,
  type ZohoContactCandidate,
} from '@/lib/admin-invite-api';
import {
  buildRecentSendIndex,
  passesInviteListFilters,
  proposedOrgHideReason,
} from '@/lib/dp-invite-contact-filters';
import {
  fetchZohoInviteSelection,
  migrateZohoInviteSelectionFromLocalStorage,
  removeZohoInviteSelectionEmails,
  saveZohoInviteSelection,
  zohoEmailsForIds,
  zohoIdsForEmails,
} from '@/lib/dp-invite-zoho-selection';

type PathwayTab = 'zoho' | 'search' | 'url' | 'manual';

type Props = {
  onApply: (payload: InvitePathwayApplyPayload) => void;
  onStartBatch?: (contacts: ZohoContactCandidate[]) => void;
  /** When set, removes these recipient emails from the saved Zoho batch selection. */
  removedFromSelection?: string[];
};

function confidenceClass(level: string) {
  if (level === 'high') return 'border-emerald-700/50 bg-emerald-950/40 text-emerald-200';
  if (level === 'medium') return 'border-amber-700/50 bg-amber-950/40 text-amber-200';
  return 'border-slate-700 bg-slate-900/60 text-slate-300';
}

const TABS: Array<{ key: PathwayTab; label: string }> = [
  { key: 'zoho', label: 'My email (Zoho)' },
  { key: 'search', label: 'Name + search' },
  { key: 'url', label: 'From URL' },
  { key: 'manual', label: 'Manual entry' },
];

function formatZohoMeta(contact: ZohoContactCandidate) {
  const parts: string[] = [];
  if (contact.message_count != null) {
    parts.push(`${contact.message_count} prior email${contact.message_count === 1 ? '' : 's'}`);
  }
  if (contact.last_contact) {
    parts.push(`last contact ${new Date(contact.last_contact).toLocaleDateString()}`);
  }
  if (contact.communication_style?.labels?.length) {
    parts.push(`style: ${contact.communication_style.labels.join(', ')}`);
  }
  return parts.join(' · ');
}

function strategyLabel(strategy?: MessageStrategy) {
  if (strategy === 'recent_follow_up') return 'Recent follow-up';
  if (strategy === 'custom') return 'Custom';
  return 'Long-gap reconnection';
}

function formatSelectionReason(reason?: OutreachSelectionReason) {
  if (!reason) return null;
  const parts: string[] = [];
  if (reason.matched_via_message_count) {
    parts.push(
      `${reason.meta_layer_message_count} meta-layer email${reason.meta_layer_message_count === 1 ? '' : 's'}`,
    );
  }
  if (reason.matched_via_topics && reason.matched_terms.length) {
    parts.push(`topic terms: ${reason.matched_terms.join(', ')}`);
  }
  if (!parts.length) {
    parts.push('matched outreach filter (no detailed signal recorded)');
  }
  return parts.join(' · ');
}

function ZohoSelectionReasonPanel({ reason }: { reason?: OutreachSelectionReason }) {
  const [open, setOpen] = useState(false);
  if (!reason) return null;
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className="flex items-center gap-1 text-xs text-cyan-300/90 hover:text-cyan-200"
        aria-expanded={open}
      >
        <span className="inline-block transition-transform" style={{ transform: open ? 'rotate(90deg)' : undefined }}>
          ▸
        </span>
        Why selected?
      </button>
      {open ? (
        <div className="mt-1 rounded border border-slate-800 bg-slate-950/70 p-2 text-xs text-slate-400">
          <p>{formatSelectionReason(reason)}</p>
          {reason.message_count > 0 ? (
            <p className="mt-1">
              {reason.message_count} total email{reason.message_count === 1 ? '' : 's'}
              {reason.keyword_score > 0 ? ` · keyword score ${reason.keyword_score}` : ''}
            </p>
          ) : null}
          {reason.sample_subject_hits.length ? (
            <p className="mt-1 text-slate-500">
              Matching subjects: {reason.sample_subject_hits.join(' · ')}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function formatZohoLoadError(message: string, statusCode?: number) {
  const normalized = message.trim().toLowerCase();
  if (
    normalized.includes('sign in to dp admin')
    || normalized === 'unauthorized'
    || normalized.includes('authentication required')
  ) {
    return 'Sign in to DP admin to use Zoho outreach.';
  }
  if (normalized.includes('not authorized for admin') || normalized === 'forbidden') {
    return 'Your account is signed in but is not authorized for DP admin.';
  }
  if (statusCode === 502 || statusCode === 504 || normalized.includes('upstream')) {
    return 'Gov Hub is temporarily unavailable. Try again in a moment.';
  }
  return message;
}

export default function AdminInviteResearchPathways({
  onApply,
  onStartBatch,
  removedFromSelection = [],
}: Props) {
  const [tab, setTab] = useState<PathwayTab>('zoho');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState('');
  const autoScanAttempted = useRef(false);
  const processedSelectionRemovals = useRef<Set<string>>(new Set());

  const [zohoContacts, setZohoContacts] = useState<ZohoContactCandidate[]>([]);
  const [zohoFilter, setZohoFilter] = useState('');
  const [showHiddenZoho, setShowHiddenZoho] = useState(false);
  const [hiddenZohoCount, setHiddenZohoCount] = useState(0);
  const [selectedZohoId, setSelectedZohoId] = useState('');
  const [selectedZohoIds, setSelectedZohoIds] = useState<string[]>([]);
  const [agentDropName, setAgentDropName] = useState('');

  const [searchName, setSearchName] = useState('');
  const [searchContext, setSearchContext] = useState('');
  const [searchResults, setSearchResults] = useState<SearchHitCandidate[]>([]);
  const [selectedSearchIds, setSelectedSearchIds] = useState<string[]>([]);

  const [sourceUrl, setSourceUrl] = useState('');
  const [urlAuthors, setUrlAuthors] = useState<UrlAuthorCandidate[]>([]);
  const [pageSummary, setPageSummary] = useState('');
  const [selectedAuthorId, setSelectedAuthorId] = useState('');
  const [selectedAuthorEmail, setSelectedAuthorEmail] = useState('');
  const [selectionSaved, setSelectionSaved] = useState(false);
  const selectionSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectionSavedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [sendRecords, setSendRecords] = useState<AdminInviteSendRecord[]>([]);
  const [excludeRecentSends, setExcludeRecentSends] = useState(false);
  const [recentSendDays, setRecentSendDays] = useState(30);
  const [hideOrgAddresses, setHideOrgAddresses] = useState(false);
  const [compactView, setCompactView] = useState(false);
  const [expandedContactIds, setExpandedContactIds] = useState<Set<string>>(new Set());

  const persistZohoSelection = useCallback(
    (ids: string[], contacts: ZohoContactCandidate[] = zohoContacts) => {
      if (!adminEmail.trim()) return;
      const emails = zohoEmailsForIds(contacts, ids);
      if (selectionSaveTimer.current) clearTimeout(selectionSaveTimer.current);
      selectionSaveTimer.current = setTimeout(() => {
        void saveZohoInviteSelection(adminEmail, emails)
          .then(() => {
            setSelectionSaved(true);
            if (selectionSavedTimer.current) clearTimeout(selectionSavedTimer.current);
            selectionSavedTimer.current = setTimeout(() => setSelectionSaved(false), 2000);
          })
          .catch(() => {
            /* selection save failed — next toggle will retry */
          });
      }, 250);
    },
    [adminEmail, zohoContacts],
  );

  const applyPersistedZohoSelection = useCallback(
    async (contacts: ZohoContactCandidate[]) => {
      if (!adminEmail.trim()) {
        setSelectedZohoIds([]);
        return;
      }
      try {
        const savedEmails = await fetchZohoInviteSelection(adminEmail);
        setSelectedZohoIds(zohoIdsForEmails(contacts, savedEmails));
      } catch {
        setSelectedZohoIds([]);
      }
    },
    [adminEmail],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/me', { credentials: 'include' });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && data.ok && typeof data.email === 'string') {
          setAdminEmail(data.email.trim().toLowerCase());
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!adminEmail.trim()) return;
    void migrateZohoInviteSelectionFromLocalStorage(adminEmail);
  }, [adminEmail]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminInviteSendRecords({ limit: 5000 });
        if (!cancelled) setSendRecords(data.records || []);
      } catch {
        if (!cancelled) setSendRecords([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sendIndex = useMemo(() => buildRecentSendIndex(sendRecords), [sendRecords]);

  const listFilterOptions = useMemo(
    () => ({
      excludeRecentSends,
      recentSendDays,
      hideOrgAddresses,
      sendIndex,
    }),
    [excludeRecentSends, recentSendDays, hideOrgAddresses, sendIndex],
  );

  function toggleExpandedContact(id: string) {
    setExpandedContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    if (!adminEmail.trim() || !removedFromSelection.length) return;
    const fresh = removedFromSelection
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email && !processedSelectionRemovals.current.has(email));
    if (!fresh.length) return;
    for (const email of fresh) processedSelectionRemovals.current.add(email);
    void removeZohoInviteSelectionEmails(adminEmail, fresh);
    setSelectedZohoIds((ids) => {
      const remove = new Set(
        zohoContacts
          .filter((row) => fresh.includes(row.email.trim().toLowerCase()))
          .map((row) => row.id),
      );
      return ids.filter((id) => !remove.has(id));
    });
  }, [adminEmail, removedFromSelection, zohoContacts]);

  const textFilteredZohoContacts = zohoFilter.trim()
    ? zohoContacts.filter((contact) => {
        const query = zohoFilter.trim().toLowerCase();
        const blob = [
          contact.name,
          contact.email,
          contact.summary,
          ...(contact.sample_subjects || []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return blob.includes(query);
      })
    : zohoContacts;

  const filteredZohoContacts = textFilteredZohoContacts.filter((contact) =>
    passesInviteListFilters(contact.email, listFilterOptions),
  );

  const filteredUrlAuthors = urlAuthors.filter((author) => {
    const email = author.suggested_email || author.email_candidates?.[0]?.email || '';
    return passesInviteListFilters(email, listFilterOptions);
  });

  async function loadZoho(showHidden = showHiddenZoho) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const data = await adminInvitePathwayZoho({ show_hidden: showHidden });
      if (!data.configured) {
        setZohoContacts([]);
        setHiddenZohoCount(0);
        setError(null);
        setNotice(
          data.error
            || 'Zoho Mail is not configured yet. Export mail as EML/ZIP, upload to Meta-Console agent drop, then use Ingest from agent drop — or set ZOHO_MAIL_* OAuth vars on Gov Hub.',
        );
        return;
      }
      if (data.error && !data.contacts?.length) {
        setError(formatZohoLoadError(data.error));
        setZohoContacts([]);
        setHiddenZohoCount(0);
        return;
      }
      const contacts = data.contacts || [];
      setZohoContacts(contacts);
      setHiddenZohoCount(data.hidden_count ?? 0);
      await applyPersistedZohoSelection(contacts);
      if (data.source === 'snapshot') {
        const exported = data.exported_at
          ? ` (exported ${new Date(data.exported_at).toLocaleDateString()})`
          : '';
        const count = data.contacts?.length ?? 0;
        const hidden = data.hidden_count ?? 0;
        const hiddenNote = hidden > 0 && !showHidden ? ` (${hidden} hidden)` : '';
        setNotice(`Loaded ${count} relevant contacts from Zoho export snapshot${exported}${hiddenNote}.`);
      } else if (!data.contacts?.length) {
        setNotice('No meta-layer related contacts found in recent Zoho mail.');
      }
    } catch (err) {
      setError(
        formatZohoLoadError(err instanceof Error ? err.message : 'Zoho scan failed'),
      );
    } finally {
      setBusy(false);
    }
  }

  async function ingestFromAgentDrop() {
    if (!agentDropName.trim()) {
      setError('Enter the ZIP filename from agent drop (e.g. zoho-export.zip).');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const data = await adminInviteIngestZoho({ agent_drop_name: agentDropName.trim() });
      if (data.error) {
        setError(data.error);
        return;
      }
      setNotice(
        `Ingested ${data.contact_count ?? 0} contacts from ${data.message_count ?? 0} messages.`,
      );
      await loadZoho();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ingest failed');
    } finally {
      setBusy(false);
    }
  }

  async function hideZohoContact(contact: ZohoContactCandidate) {
    setBusy(true);
    setError(null);
    try {
      await adminInviteHideContact({ recipient_email: contact.email });
      setZohoContacts((rows) => rows.filter((row) => row.id !== contact.id));
      setSelectedZohoIds((ids) => {
        const next = ids.filter((id) => id !== contact.id);
        persistZohoSelection(
          next,
          zohoContacts.filter((row) => row.id !== contact.id),
        );
        return next;
      });
      if (adminEmail.trim()) {
        void removeZohoInviteSelectionEmails(adminEmail, [contact.email]);
      }
      if (selectedZohoId === contact.id) setSelectedZohoId('');
      setHiddenZohoCount((count) => count + 1);
      setNotice(`Hidden ${contact.name || contact.email}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hide failed');
    } finally {
      setBusy(false);
    }
  }

  async function runSearch() {
    if (!searchName.trim()) {
      setError('Enter a name to search.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const data = await adminInvitePathwaySearch({
        name: searchName.trim(),
        context: searchContext.trim() || undefined,
      });
      if (data.error) {
        setError(data.error);
        return;
      }
      setSearchResults(data.results || []);
      setSelectedSearchIds([]);
      if (data.message) setNotice(data.message);
      if (!data.results?.length) setNotice('No search results returned.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setBusy(false);
    }
  }

  async function runUrlAnalysis() {
    if (!sourceUrl.trim()) {
      setError('Enter a URL to analyze.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const data = await adminInvitePathwayUrl({ url: sourceUrl.trim() });
      if (data.error) {
        setError(data.error);
        return;
      }
      setUrlAuthors(data.authors || []);
      setPageSummary(data.page_summary || '');
      setSelectedAuthorId('');
      setSelectedAuthorEmail('');
      if (!data.authors?.length) setNotice('No authors were extracted from that page.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'URL analysis failed');
    } finally {
      setBusy(false);
    }
  }

  async function applySelection() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const zohoContact =
        tab === 'zoho'
          ? zohoContacts.find((row) => row.id === selectedZohoId) || null
          : null;
      const searchHits =
        tab === 'search'
          ? searchResults.filter((row) => selectedSearchIds.includes(row.id))
          : [];
      const urlAuthor =
        tab === 'url'
          ? urlAuthors.find((row) => row.id === selectedAuthorId) || null
          : null;

      if (tab === 'zoho' && !zohoContact) {
        setError('Select a Zoho contact first.');
        return;
      }
      if (tab === 'search' && !searchHits.length) {
        setError('Select at least one relevant search result.');
        return;
      }
      if (tab === 'url' && !urlAuthor) {
        setError('Select an author from the URL analysis.');
        return;
      }

      const payload = await adminInvitePathwayApply({
        zoho_contact: zohoContact,
        search_results: searchHits,
        url_author: urlAuthor
          ? {
              ...urlAuthor,
              suggested_email: selectedAuthorEmail || urlAuthor.suggested_email,
            }
          : null,
        page_summary: pageSummary,
      });
      onApply(payload);
      setNotice('Research context applied to the invite form below.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not apply research context');
    } finally {
      setBusy(false);
    }
  }

  function toggleZohoContact(id: string) {
    setSelectedZohoIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((value) => value !== id)
        : [...prev, id];
      persistZohoSelection(next);
      return next;
    });
    setSelectedZohoId(id);
  }

  useEffect(() => {
    if (!adminEmail.trim() || autoScanAttempted.current) return;
    autoScanAttempted.current = true;
    void fetchZohoInviteSelection(adminEmail).then((emails) => {
      if (emails.length) void loadZoho();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when admin email is known
  }, [adminEmail]);

  function startBatchReview() {
    const selected = zohoContacts.filter((row) => selectedZohoIds.includes(row.id));
    if (selected.length < 2) {
      setError('Select at least two Zoho contacts for batch review.');
      return;
    }
    onStartBatch?.(selected);
    setNotice(`Batch queue started with ${selected.length} contacts.`);
  }

  function toggleSearchHit(id: string) {
    setSelectedSearchIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    );
  }

  const selectedAuthor = urlAuthors.find((row) => row.id === selectedAuthorId);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            disabled={busy}
            onClick={() => {
              setTab(item.key);
              setError(null);
              setNotice(null);
            }}
            className={`rounded-md px-3 py-1.5 text-sm ${
              tab === item.key
                ? 'bg-cyan-700 text-white'
                : 'border border-slate-700 text-slate-300 hover:border-slate-500'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
      {notice ? <p className="mt-4 text-sm text-amber-200/90">{notice}</p> : null}
      {selectionSaved ? (
        <p className="mt-2 text-xs text-emerald-300/90">Selection saved to server.</p>
      ) : null}

      {tab !== 'manual' &&
      (zohoContacts.length > 0 || searchResults.length > 0 || urlAuthors.length > 0) ? (
        <div className="mt-4">
          <AdminInviteListFilters
            excludeRecentSends={excludeRecentSends}
            recentSendDays={recentSendDays}
            hideOrgAddresses={hideOrgAddresses}
            compactView={compactView}
            onExcludeRecentSendsChange={setExcludeRecentSends}
            onRecentSendDaysChange={setRecentSendDays}
            onHideOrgAddressesChange={setHideOrgAddresses}
            onCompactViewChange={setCompactView}
            disabled={busy}
            filteredCount={tab === 'zoho' ? filteredZohoContacts.length : undefined}
            totalCount={tab === 'zoho' ? textFilteredZohoContacts.length : undefined}
          />
        </div>
      ) : null}

      {tab === 'zoho' ? (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-slate-400">
            Upload a Zoho mail export ZIP to{' '}
            <a
              href="https://console.themetalayer.org/agent-drop"
              target="_blank"
              rel="noreferrer"
              className="text-cyan-300 hover:underline"
            >
              Meta-Console agent drop
            </a>
            , ingest it here, then scan and batch-review contacts.
          </p>
          <div className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3 sm:flex-row sm:items-end">
            <label className="block flex-1 text-sm">
              <span className="text-slate-300">Agent drop ZIP filename</span>
              <input
                value={agentDropName}
                onChange={(e) => setAgentDropName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                disabled={busy}
                placeholder="zoho-mail-export.zip"
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => void ingestFromAgentDrop()}
              className="rounded-lg border border-violet-700/70 px-4 py-2 text-sm font-medium text-violet-100 hover:border-violet-500 disabled:opacity-50"
            >
              Ingest from agent drop
            </button>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void loadZoho()}
            className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
          >
            {busy ? 'Scanning Zoho…' : 'Scan Zoho mail'}
          </button>
          {zohoContacts.length > 0 ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm text-slate-400">
                  {filteredZohoContacts.length === textFilteredZohoContacts.length
                    ? `${textFilteredZohoContacts.length} relevant contacts`
                    : `${filteredZohoContacts.length} of ${textFilteredZohoContacts.length} contacts`}
                  {textFilteredZohoContacts.length !== zohoContacts.length
                    ? ` (${zohoContacts.length} total)`
                    : ''}
                  {' — '}select one for the form, or multiple for batch review.
                </p>
                {selectedZohoIds.length >= 2 ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={startBatchReview}
                    className="rounded-lg bg-cyan-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
                  >
                    Start batch review ({selectedZohoIds.length})
                  </button>
                ) : null}
              </div>
              <label className="block text-sm">
                <span className="text-slate-300">Filter contacts</span>
                <input
                  value={zohoFilter}
                  onChange={(e) => setZohoFilter(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  disabled={busy}
                  placeholder="Search by name, email, or subject…"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-400">
                <input
                  type="checkbox"
                  checked={showHiddenZoho}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setShowHiddenZoho(next);
                    void loadZoho(next);
                  }}
                  disabled={busy}
                />
                Show hidden / already contacted
                {hiddenZohoCount > 0 && !showHiddenZoho ? ` (${hiddenZohoCount})` : ''}
              </label>
              <ul
                className={
                  compactView
                    ? 'max-h-[32rem] overflow-y-auto divide-y divide-slate-800 rounded-lg border border-slate-800'
                    : 'max-h-[32rem] space-y-3 overflow-y-auto pr-1'
                }
              >
                {filteredZohoContacts.map((contact) => {
                  const orgHideReason = proposedOrgHideReason(contact.email);
                  const expanded = expandedContactIds.has(contact.id);
                  const details = (
                    <>
                      {contact.summary ? (
                        <p className="text-sm text-slate-400">{contact.summary}</p>
                      ) : null}
                      {formatZohoMeta(contact) ? (
                        <p className="mt-1">{formatZohoMeta(contact)}</p>
                      ) : null}
                      {contact.sample_subjects?.length ? (
                        <p className="mt-1">
                          Subjects: {contact.sample_subjects.join(' · ')}
                        </p>
                      ) : null}
                      {orgHideReason ? (
                        <p className="mt-1 text-amber-400/90">Proposed hide: {orgHideReason}</p>
                      ) : null}
                      <ZohoSelectionReasonPanel reason={contact.selection_reason} />
                    </>
                  );

                  if (compactView) {
                    return (
                      <AdminInviteCompactListRow
                        key={contact.id}
                        compactView
                        expanded={expanded}
                        onToggleExpanded={() => toggleExpandedContact(contact.id)}
                        checkbox={
                          <>
                            <input
                              type="checkbox"
                              checked={selectedZohoIds.includes(contact.id)}
                              onChange={() => toggleZohoContact(contact.id)}
                              disabled={busy}
                              className="shrink-0"
                            />
                            <input
                              type="radio"
                              name="zoho-contact"
                              checked={selectedZohoId === contact.id}
                              onChange={() => setSelectedZohoId(contact.id)}
                              disabled={busy}
                              className="shrink-0"
                            />
                          </>
                        }
                        primary={
                          <p className="truncate font-medium text-white">
                            {contact.name}
                            <span className="ml-2 font-normal text-slate-400">{contact.email}</span>
                            <span
                              className={`ml-2 rounded-full border px-2 py-0.5 text-xs ${confidenceClass(contact.confidence)}`}
                            >
                              {contact.confidence} · {contact.score}%
                            </span>
                          </p>
                        }
                        secondary={
                          contact.suggested_strategy
                            ? `${strategyLabel(contact.suggested_strategy)} · ${formatZohoMeta(contact) || contact.email}`
                            : formatZohoMeta(contact) || contact.email
                        }
                        actions={
                          <button
                            type="button"
                            disabled={busy}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              void hideZohoContact(contact);
                            }}
                            className="shrink-0 rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-rose-700 hover:text-rose-200 disabled:opacity-50"
                            title="Hide this contact from future scans"
                          >
                            Hide
                          </button>
                        }
                        details={details}
                      />
                    );
                  }

                  return (
                  <li
                    key={contact.id}
                    className="rounded-lg border border-slate-800 bg-slate-900/50 p-4"
                  >
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedZohoIds.includes(contact.id)}
                        onChange={() => toggleZohoContact(contact.id)}
                        disabled={busy}
                        className="mt-1"
                      />
                      <input
                        type="radio"
                        name="zoho-contact"
                        checked={selectedZohoId === contact.id}
                        onChange={() => setSelectedZohoId(contact.id)}
                        disabled={busy}
                        className="mt-1"
                      />
                      <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-white">{contact.name}</span>
                        <span className="text-sm text-slate-400">{contact.email}</span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs ${confidenceClass(contact.confidence)}`}
                        >
                          {contact.confidence} · {contact.score}%
                        </span>
                        {contact.suggested_strategy ? (
                          <span className="rounded-full border border-cyan-800/60 bg-cyan-950/40 px-2 py-0.5 text-xs text-cyan-100">
                            {strategyLabel(contact.suggested_strategy)}
                          </span>
                        ) : null}
                      </span>
                      {contact.summary ? (
                        <span className="mt-1 block text-sm text-slate-400">{contact.summary}</span>
                      ) : null}
                      {formatZohoMeta(contact) ? (
                        <span className="mt-1 block text-xs text-slate-500">{formatZohoMeta(contact)}</span>
                      ) : null}
                      {contact.sample_subjects?.length ? (
                        <span className="mt-1 block text-xs text-slate-500">
                          Subjects: {contact.sample_subjects.join(' · ')}
                        </span>
                      ) : null}
                      {orgHideReason ? (
                        <span className="mt-1 block text-xs text-amber-400/90">
                          Proposed hide: {orgHideReason}
                        </span>
                      ) : null}
                      <ZohoSelectionReasonPanel reason={contact.selection_reason} />
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void hideZohoContact(contact);
                      }}
                      className="shrink-0 rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-rose-700 hover:text-rose-200 disabled:opacity-50"
                      title="Hide this contact from future scans"
                    >
                      Hide
                    </button>
                  </label>
                </li>
                  );
                })}
            </ul>
            {filteredZohoContacts.length === 0 && textFilteredZohoContacts.length > 0 ? (
              <p className="mt-2 text-sm text-slate-500">No contacts match the current filters.</p>
            ) : null}
            </>
          ) : null}
        </div>
      ) : null}

      {tab === 'search' ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-slate-300">Name</span>
              <input
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                disabled={busy}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-slate-300">Context (optional)</span>
              <input
                value={searchContext}
                onChange={(e) => setSearchContext(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                disabled={busy}
                placeholder="e.g. governance researcher, fork in the web, civic memory"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void runSearch()}
            className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
          >
            {busy ? 'Searching…' : 'Search web'}
          </button>
          {searchResults.length > 0 ? (
            <ul
              className={
                compactView
                  ? 'divide-y divide-slate-800 rounded-lg border border-slate-800'
                  : 'space-y-3'
              }
            >
              {searchResults.map((hit) => {
                const hitKey = `search-${hit.id}`;
                const expanded = expandedContactIds.has(hitKey);

                if (compactView) {
                  return (
                    <AdminInviteCompactListRow
                      key={hit.id}
                      compactView
                      expanded={expanded}
                      onToggleExpanded={() => toggleExpandedContact(hitKey)}
                      checkbox={
                        <input
                          type="checkbox"
                          checked={selectedSearchIds.includes(hit.id)}
                          onChange={() => toggleSearchHit(hit.id)}
                          disabled={busy}
                          className="shrink-0"
                        />
                      }
                      primary={
                        <p className="truncate font-medium text-white">
                          {hit.title || hit.url}
                          <span
                            className={`ml-2 rounded-full border px-2 py-0.5 text-xs ${confidenceClass(hit.relevance)}`}
                          >
                            {hit.relevance} · {hit.relevance_score}%
                          </span>
                        </p>
                      }
                      secondary={hit.url}
                      details={
                        <>
                          {hit.snippet ? <p>{hit.snippet}</p> : null}
                          {hit.url ? (
                            <a
                              href={hit.url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 block text-cyan-300 hover:underline"
                            >
                              {hit.url}
                            </a>
                          ) : null}
                        </>
                      }
                    />
                  );
                }

                return (
                <li key={hit.id} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedSearchIds.includes(hit.id)}
                      onChange={() => toggleSearchHit(hit.id)}
                      disabled={busy}
                      className="mt-1"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-white">{hit.title || hit.url}</span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs ${confidenceClass(hit.relevance)}`}
                        >
                          {hit.relevance} · {hit.relevance_score}%
                        </span>
                      </span>
                      {hit.snippet ? (
                        <span className="mt-1 block text-sm text-slate-400">{hit.snippet}</span>
                      ) : null}
                      {hit.url ? (
                        <a
                          href={hit.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 block text-xs text-cyan-300 hover:underline"
                        >
                          {hit.url}
                        </a>
                      ) : null}
                    </span>
                  </label>
                </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}

      {tab === 'url' ? (
        <div className="mt-4 space-y-4">
          <label className="block text-sm">
            <span className="text-slate-300">Article or page URL</span>
            <input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              disabled={busy}
              placeholder="https://…"
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void runUrlAnalysis()}
            className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
          >
            {busy ? 'Analyzing…' : 'Extract authors'}
          </button>
          {urlAuthors.length > 0 ? (
            <ul
              className={
                compactView
                  ? 'divide-y divide-slate-800 rounded-lg border border-slate-800'
                  : 'space-y-3'
              }
            >
              {filteredUrlAuthors.map((author) => {
                const authorKey = `url-${author.id}`;
                const expanded = expandedContactIds.has(authorKey);
                const email = author.suggested_email || author.email_candidates?.[0]?.email || '';
                const orgHideReason = proposedOrgHideReason(email);

                if (compactView) {
                  return (
                    <AdminInviteCompactListRow
                      key={author.id}
                      compactView
                      expanded={expanded}
                      onToggleExpanded={() => toggleExpandedContact(authorKey)}
                      checkbox={
                        <input
                          type="radio"
                          name="url-author"
                          checked={selectedAuthorId === author.id}
                          onChange={() => {
                            setSelectedAuthorId(author.id);
                            setSelectedAuthorEmail(author.suggested_email || '');
                          }}
                          disabled={busy}
                          className="shrink-0"
                        />
                      }
                      primary={
                        <p className="truncate font-medium text-white">
                          {author.name}
                          {author.role ? (
                            <span className="ml-2 font-normal text-slate-400">{author.role}</span>
                          ) : null}
                          <span
                            className={`ml-2 rounded-full border px-2 py-0.5 text-xs ${confidenceClass(author.confidence)}`}
                          >
                            {author.confidence} · {author.score}%
                          </span>
                        </p>
                      }
                      secondary={email || author.context || 'No email'}
                      details={
                        <>
                          {author.context ? <p>{author.context}</p> : null}
                          {email ? <p className="mt-1 text-slate-400">{email}</p> : null}
                          {orgHideReason ? (
                            <p className="mt-1 text-amber-400/90">Proposed hide: {orgHideReason}</p>
                          ) : null}
                        </>
                      }
                    />
                  );
                }

                return (
                <li key={author.id} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="radio"
                      name="url-author"
                      checked={selectedAuthorId === author.id}
                      onChange={() => {
                        setSelectedAuthorId(author.id);
                        setSelectedAuthorEmail(author.suggested_email || '');
                      }}
                      disabled={busy}
                      className="mt-1"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-white">{author.name}</span>
                        {author.role ? (
                          <span className="text-sm text-slate-400">{author.role}</span>
                        ) : null}
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs ${confidenceClass(author.confidence)}`}
                        >
                          {author.confidence} · {author.score}%
                        </span>
                      </span>
                      {author.context ? (
                        <span className="mt-1 block text-sm text-slate-400">{author.context}</span>
                      ) : null}
                      {orgHideReason ? (
                        <span className="mt-1 block text-xs text-amber-400/90">
                          Proposed hide: {orgHideReason}
                        </span>
                      ) : null}
                    </span>
                  </label>
                </li>
                );
              })}
            </ul>
          ) : null}
          {urlAuthors.length > 0 && filteredUrlAuthors.length === 0 ? (
            <p className="text-sm text-slate-500">No authors match the current filters.</p>
          ) : null}
          {selectedAuthor ? (
            <label className="block text-sm">
              <span className="text-slate-300">Email (pick or edit)</span>
              <input
                list="author-email-options"
                value={selectedAuthorEmail}
                onChange={(e) => setSelectedAuthorEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                disabled={busy}
                placeholder="name@domain.com"
              />
              <datalist id="author-email-options">
                {(selectedAuthor.email_candidates || []).map((candidate) => (
                  <option key={candidate.email} value={candidate.email}>
                    {candidate.source_title || candidate.source_url}
                  </option>
                ))}
              </datalist>
            </label>
          ) : null}
        </div>
      ) : null}

      {tab === 'manual' ? (
        <p className="mt-4 text-sm text-slate-400">
          Use the invite form below to enter the recipient manually.
        </p>
      ) : null}

      {tab !== 'manual' ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void applySelection()}
          className="mt-4 rounded-lg border border-cyan-700/60 px-4 py-2 text-sm font-medium text-cyan-100 hover:border-cyan-500 disabled:opacity-50"
        >
          Apply selected research to invite form
        </button>
      ) : null}
    </div>
  );
}
