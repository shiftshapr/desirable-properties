'use client';

import { useState } from 'react';
import {
  adminInviteIngestZoho,
  adminInvitePathwayApply,
  adminInvitePathwaySearch,
  adminInvitePathwayUrl,
  adminInvitePathwayZoho,
  type InvitePathwayApplyPayload,
  type SearchHitCandidate,
  type UrlAuthorCandidate,
  type ZohoContactCandidate,
} from '@/lib/admin-invite-api';

type PathwayTab = 'zoho' | 'search' | 'url' | 'manual';

type Props = {
  onApply: (payload: InvitePathwayApplyPayload) => void;
  onStartBatch?: (contacts: ZohoContactCandidate[]) => void;
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

export default function AdminInviteResearchPathways({ onApply, onStartBatch }: Props) {
  const [tab, setTab] = useState<PathwayTab>('zoho');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [zohoContacts, setZohoContacts] = useState<ZohoContactCandidate[]>([]);
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

  async function loadZoho() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const data = await adminInvitePathwayZoho();
      if (data.error && !data.contacts?.length) {
        setError(data.error);
        setZohoContacts([]);
        return;
      }
      setZohoContacts(data.contacts || []);
      setSelectedZohoIds([]);
      if (!data.configured) {
        setNotice(
          data.error
            || 'Zoho Mail is not configured on Gov Hub yet. Export mail as EML/ZIP and run scripts/zoho_mail_ingest_export.py, or set ZOHO_MAIL_* OAuth vars.',
        );
      } else if (data.source === 'snapshot') {
        const exported = data.exported_at
          ? ` (exported ${new Date(data.exported_at).toLocaleDateString()})`
          : '';
        setNotice(`Using one-time Zoho mail export snapshot${exported}.`);
      } else if (!data.contacts?.length) {
        setNotice('No meta-layer related contacts found in recent Zoho mail.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Zoho scan failed');
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
    setSelectedZohoIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    );
    setSelectedZohoId(id);
  }

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
                  Select one contact for the form, or multiple for batch review.
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
              <ul className="space-y-3">
                {zohoContacts.map((contact) => (
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
                    </span>
                  </label>
                </li>
              ))}
            </ul>
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
            <ul className="space-y-3">
              {searchResults.map((hit) => (
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
              ))}
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
            <ul className="space-y-3">
              {urlAuthors.map((author) => (
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
                    </span>
                  </label>
                </li>
              ))}
            </ul>
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
