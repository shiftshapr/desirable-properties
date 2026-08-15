'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminInviteBatchReview from '@/components/admin/AdminInviteBatchReview';
import AdminInviteWorkgroupPicker from '@/components/admin/AdminInviteWorkgroupPicker';
import AdminInviteResearchPathways from '@/components/admin/AdminInviteResearchPathways';
import WorkgroupInviteContentPicker from '@/components/workgroup/WorkgroupInviteContentPicker';
import WorkgroupInviteDisambiguation from '@/components/workgroup/WorkgroupInviteDisambiguation';
import WorkgroupInviteDraftEditor from '@/components/workgroup/WorkgroupInviteDraftEditor';
import WorkgroupInviteResearchForm from '@/components/workgroup/WorkgroupInviteResearchForm';
import WorkgroupInviteSendConfirm from '@/components/workgroup/WorkgroupInviteSendConfirm';
import {
  adminInviteBatchHistory,
  adminInviteBatchRecord,
  adminInviteDraft,
  adminInvitePathwayApply,
  adminInviteResearch,
  adminInviteSend,
  adminInviteSendRecords,
  type AdminInviteSendRecord,
  type InvitePathwayApplyPayload,
  type MessageStrategy,
  type ZohoContactCandidate,
} from '@/lib/admin-invite-api';
import {
  buildInviteContentContext,
  type InviteContentCatalog,
} from '@/lib/dp-invite-content-context';
import type {
  InviteCandidate,
  InviteContentContext,
  InviteLeadType,
  InviteResearchResponse,
  PriorInvitation,
  ResolvedPerson,
  WorkgroupCatalogEntry,
  WorkgroupMatch,
  ZohoContactContext,
} from '@/lib/workgroup-collab-types';

type Step = 'research' | 'disambiguate' | 'workgroups' | 'draft' | 'done';

function strategyFromContact(contact?: ZohoContactCandidate | null): MessageStrategy {
  return contact?.message_strategy || contact?.suggested_strategy || 'long_gap_reconnect';
}

function buildPathwayPayloadFromZohoContact(
  contact: ZohoContactCandidate,
): InvitePathwayApplyPayload {
  const previousParts: string[] = [];
  if (contact.summary?.trim()) previousParts.push(contact.summary.trim());
  if (contact.sample_subjects?.length) {
    previousParts.push(
      `Prior email subjects: ${contact.sample_subjects.slice(0, 6).join('; ')}`,
    );
  }
  if (contact.snippets?.length) {
    previousParts.push(contact.snippets.slice(0, 4).map((snippet) => `> ${snippet}`).join('\n'));
  }
  return {
    name: (contact.name || '').trim() || contact.email,
    email: contact.email.trim(),
    previous_interaction: previousParts.join('\n\n'),
    extra_links: [],
    zoho_contact_context: {
      source: 'zoho_batch',
      email: contact.email,
      name: contact.name,
      last_contact: contact.last_contact,
      message_count: contact.message_count,
      subjects: contact.sample_subjects,
      snippets: contact.snippets,
      summary: contact.summary,
      communication_style: contact.communication_style,
      suggested_strategy: contact.suggested_strategy || contact.message_strategy,
      message_strategy: contact.message_strategy || contact.suggested_strategy,
    },
  };
}

export default function AdminInviteAiPanel() {
  const [step, setStep] = useState<Step>('research');
  const [draftBusy, setDraftBusy] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [previousInteraction, setPreviousInteraction] = useState('');
  const [extraLinks, setExtraLinks] = useState('');
  const [zohoContactContext, setZohoContactContext] = useState<ZohoContactContext | null>(null);

  const [candidates, setCandidates] = useState<InviteCandidate[]>([]);
  const [resolvedPerson, setResolvedPerson] = useState<ResolvedPerson | null>(null);
  const [workgroupMatches, setWorkgroupMatches] = useState<WorkgroupMatch[]>([]);
  const [workgroupCatalog, setWorkgroupCatalog] = useState<WorkgroupCatalogEntry[]>([]);
  const [primaryWorkgroupId, setPrimaryWorkgroupId] = useState('');
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);
  const [priorInvitations, setPriorInvitations] = useState<PriorInvitation[]>([]);
  const [researchWarnings, setResearchWarnings] = useState<string[]>([]);

  const [tone, setTone] = useState('warm');
  const [length, setLength] = useState('medium');
  const [draft, setDraft] = useState('');
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [selectedPerspectiveIds, setSelectedPerspectiveIds] = useState<string[]>([]);
  const [inviteLead, setInviteLead] = useState<InviteLeadType>('events');
  const [contentCatalog, setContentCatalog] = useState<InviteContentCatalog>({
    events: [],
    seriesEvents: [],
    perspectives: [],
  });
  const [contentCatalogLoading, setContentCatalogLoading] = useState(true);
  const [contentCatalogError, setContentCatalogError] = useState<string | null>(null);

  const [platformDone, setPlatformDone] = useState(false);
  const [mailto, setMailto] = useState('');
  const [mailSubject, setMailSubject] = useState('');
  const [mailBody, setMailBody] = useState('');

  const [batchQueue, setBatchQueue] = useState<ZohoContactCandidate[]>([]);
  const [batchIndex, setBatchIndex] = useState(0);
  const [batchPrefill, setBatchPrefill] = useState<
    Record<string, { draft: string; primaryWorkgroupId?: string }>
  >({});
  const [messageStrategy, setMessageStrategy] = useState<MessageStrategy>('long_gap_reconnect');
  const [strategyConfirmed, setStrategyConfirmed] = useState(false);
  const [sendHistory, setSendHistory] = useState<AdminInviteSendRecord[]>([]);
  const [selectionRemovals, setSelectionRemovals] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setContentCatalogLoading(true);
      setContentCatalogError(null);
      try {
        const res = await fetch('/api/invite-content', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.message || 'Failed to load invite content');
        }
        if (!cancelled) {
          setContentCatalog({
            events: data.events || [],
            seriesEvents: data.seriesEvents || [],
            perspectives: data.perspectives || [],
          });
        }
      } catch (err) {
        if (!cancelled) {
          setContentCatalogError(
            err instanceof Error ? err.message : 'Failed to load invite content',
          );
        }
      } finally {
        if (!cancelled) setContentCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminInviteSendRecords({ limit: 20 });
        if (!cancelled) setSendHistory(data.records || []);
      } catch {
        if (!cancelled) setSendHistory([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function parseExtraLinks() {
    return extraLinks
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function resolveInviteContentForDraft(): InviteContentContext | null {
    return buildInviteContentContext(
      selectedEventIds,
      selectedPerspectiveIds,
      inviteLead,
      contentCatalog,
    );
  }

  const handleInviteContentChange = useCallback(
    (patch: {
      selectedEventIds?: string[];
      selectedPerspectiveIds?: string[];
      lead?: InviteLeadType;
    }) => {
      if (patch.selectedEventIds !== undefined) setSelectedEventIds(patch.selectedEventIds);
      if (patch.selectedPerspectiveIds !== undefined) {
        setSelectedPerspectiveIds(patch.selectedPerspectiveIds);
      }
      if (patch.lead !== undefined) setInviteLead(patch.lead);
    },
    [],
  );

  function resetInvite() {
    setStep('research');
    setDraftBusy(false);
    setSendBusy(false);
    setError(null);
    setName('');
    setEmail('');
    setLinkedinUrl('');
    setPreviousInteraction('');
    setExtraLinks('');
    setZohoContactContext(null);
    setCandidates([]);
    setResolvedPerson(null);
    setWorkgroupMatches([]);
    setWorkgroupCatalog([]);
    setPrimaryWorkgroupId('');
    setSelectedExtraIds([]);
    setPriorInvitations([]);
    setResearchWarnings([]);
    setSelectedEventIds([]);
    setSelectedPerspectiveIds([]);
    setInviteLead('events');
    setTone('warm');
    setLength('medium');
    setDraft('');
    setPlatformDone(false);
    setMailto('');
    setMailSubject('');
    setMailBody('');
    setBatchQueue([]);
    setBatchIndex(0);
    setBatchPrefill({});
    setMessageStrategy('long_gap_reconnect');
    setStrategyConfirmed(false);
  }

  function applyResearchResult(data: {
    workgroup_matches?: WorkgroupMatch[];
    workgroup_catalog?: WorkgroupCatalogEntry[];
    prior_invitations?: PriorInvitation[];
    resolved_person?: ResolvedPerson | null;
    corpus_meta?: InviteResearchResponse['corpus_meta'];
  }) {
    const matches = data.workgroup_matches || [];
    const catalog = data.workgroup_catalog || [];
    setWorkgroupMatches(matches);
    setWorkgroupCatalog(catalog);
    setPriorInvitations(data.prior_invitations || []);
    setResearchWarnings(data.corpus_meta?.research_warnings || []);
    if (data.resolved_person) setResolvedPerson(data.resolved_person);
    const defaultPrimary = matches[0]?.workgroup_id || catalog[0]?.id || '';
    setPrimaryWorkgroupId(defaultPrimary);
    setSelectedExtraIds([]);
    setStep('workgroups');
  }

  async function runDraft(opts?: { tone?: string; length?: string; regenerate?: boolean }) {
    const allowGenericBatchDraft =
      inBatchMode && !primaryWorkgroupId && messageStrategy === 'long_gap_reconnect';
    if (!primaryWorkgroupId && !allowGenericBatchDraft) {
      setError('Select a primary workgroup or use generic reconnect (no specific DP).');
      return;
    }
    if (batchQueue.length > 0 && !strategyConfirmed) {
      setError('Confirm the message approach for this contact before drafting.');
      return;
    }
    const effectiveTone = opts?.tone ?? tone;
    const effectiveLength = opts?.length ?? length;
    const isRegenerate = opts?.regenerate ?? false;
    setDraftBusy(true);
    setError(null);
    const previousDraft = draft;
    const hasContentSelections =
      selectedEventIds.length > 0 || selectedPerspectiveIds.length > 0;
    if (hasContentSelections && contentCatalogLoading) {
      setError('Still loading events and perspectives – try again in a moment.');
      setDraftBusy(false);
      return;
    }
    if (hasContentSelections && contentCatalogError) {
      setError(`Cannot include invite content: ${contentCatalogError}`);
      setDraftBusy(false);
      return;
    }
    const inviteContent = resolveInviteContentForDraft();
    if (hasContentSelections && !inviteContent) {
      setError(
        'Selected events or perspectives could not be resolved. Refresh the page and try again.',
      );
      setDraftBusy(false);
      return;
    }
    try {
      const data = await adminInviteDraft({
        name: name.trim(),
        email: email.trim(),
        primary_workgroup_id: primaryWorkgroupId || undefined,
        tone: effectiveTone,
        length: effectiveLength,
        previous_interaction: previousInteraction.trim() || undefined,
        resolved_person: resolvedPerson,
        additional_workgroup_ids: selectedExtraIds.filter((id) => id !== primaryWorkgroupId),
        prior_invitations: priorInvitations,
        invite_content: inviteContent,
        zoho_contact_context: zohoContactContext
          ? { ...zohoContactContext, message_strategy: messageStrategy }
          : null,
        message_strategy: messageStrategy,
        strategy_confirmed: strategyConfirmed,
        regenerate: isRegenerate,
        previous_draft: isRegenerate ? previousDraft : undefined,
      });
      if (data.blocked || data.error) {
        setError(data.error || 'Draft blocked');
        return;
      }
      const nextDraft = (data.draft || '').trim();
      if (nextDraft) {
        setDraft(nextDraft);
      } else if (previousDraft.trim()) {
        setError('Regenerate returned an empty draft – your previous text is unchanged.');
      } else {
        setDraft('');
      }
      if (data.prior_invitations) setPriorInvitations(data.prior_invitations);
      setStep('draft');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Draft failed');
    } finally {
      setDraftBusy(false);
    }
  }

  async function ensureWorkgroupCatalog(): Promise<WorkgroupCatalogEntry[]> {
    if (workgroupCatalog.length) return workgroupCatalog;
    try {
      const res = await fetch('/api/admin/broadcast?view=workgroups', {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json();
      const catalog = (data.workgroups || []).map(
        (wg: { id: string; name: string; slug?: string }) => ({
          id: wg.id,
          name: wg.name,
          slug: wg.slug || '',
          description: '',
        }),
      );
      setWorkgroupCatalog(catalog);
      if (!primaryWorkgroupId && catalog[0]?.id) {
        setPrimaryWorkgroupId(catalog[0].id);
      }
      return catalog;
    } catch {
      return [];
    }
  }

  async function continueToDraftFromForm(
    person?: ResolvedPerson | null,
    prior?: PriorInvitation[],
  ) {
    const fallback = person || resolvedPerson || {
      name: name.trim(),
      headline: linkedinUrl.trim() ? 'LinkedIn profile provided' : '',
      summary: previousInteraction.trim(),
      expertise_tags: [] as string[],
    };
    setResolvedPerson(fallback);
    setPriorInvitations(prior || priorInvitations);
    await ensureWorkgroupCatalog();
    setStep('workgroups');
  }

  async function runResearch(selectedIndex?: number | null) {
    setDraftBusy(true);
    setError(null);
    try {
      const data = await adminInviteResearch({
        name: name.trim(),
        email: email.trim(),
        linkedin_url: linkedinUrl.trim() || undefined,
        previous_interaction: previousInteraction.trim() || undefined,
        extra_links: parseExtraLinks(),
        selected_candidate_index: selectedIndex ?? null,
      });
      if (data.blocked || data.error) {
        setError(data.error || 'Invite blocked');
        return;
      }
      setCandidates(data.candidates || []);
      if (data.ambiguous && selectedIndex == null) {
        if (!data.candidates?.length) {
          applyResearchResult(data);
          return;
        }
        setPriorInvitations(data.prior_invitations || []);
        if (data.resolved_person) setResolvedPerson(data.resolved_person);
        setStep('disambiguate');
        return;
      }
      applyResearchResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Research failed');
    } finally {
      setDraftBusy(false);
    }
  }

  async function send(mode: 'platform' | 'client') {
    if (!draft.trim()) {
      setError('Add or load a draft before sending.');
      return;
    }
    const allowGenericBatchSend =
      inBatchMode && !primaryWorkgroupId && messageStrategy === 'long_gap_reconnect';
    if (!primaryWorkgroupId && !allowGenericBatchSend) {
      setError(
        'Select a primary workgroup or choose generic reconnect (no specific DP) before sending.',
      );
      return;
    }
    setSendBusy(true);
    setError(null);
    try {
      const data = await adminInviteSend({
        name: name.trim(),
        email: email.trim(),
        body: draft.trim(),
        primary_workgroup_id: primaryWorkgroupId || undefined,
        additional_workgroup_ids: selectedExtraIds.filter((id) => id !== primaryWorkgroupId),
        send_mode: mode,
        source: batchQueue.length ? 'zoho_batch' : 'manual',
        message_strategy: batchQueue.length ? messageStrategy : undefined,
      });
      if (data.blocked || data.error) {
        setError(data.error || 'Send failed');
        return;
      }
      if (mode === 'platform') {
        setPlatformDone(true);
        if (batchQueue.length) {
          setSelectionRemovals((prev) => [...prev, email.trim()]);
          await advanceBatch('sent');
          return;
        }
        setStep('done');
      } else {
        setMailto(data.mailto || '');
        setMailSubject(data.subject || '');
        setMailBody(data.body || '');
      }
      const history = await adminInviteSendRecords({ limit: 20 });
      setSendHistory(history.records || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
      throw err;
    } finally {
      setSendBusy(false);
    }
  }

  function toggleExtra(workgroupId: string) {
    setSelectedExtraIds((prev) =>
      prev.includes(workgroupId)
        ? prev.filter((id) => id !== workgroupId)
        : [...prev, workgroupId],
    );
  }

  const anyBusy = draftBusy || sendBusy;
  const recipientLabel = name.trim() || resolvedPerson?.name || 'Recipient';
  const recipientEmail = email.trim();
  const hasDraft = Boolean(draft.trim());
  const showDraftPhase = step === 'draft' || step === 'done' || (step === 'research' && hasDraft);
  const inBatchMode = batchQueue.length > 0;

  function firstLinkedInUrl(links: string[]) {
    for (const link of links) {
      if (/linkedin\.com\/in\//i.test(link)) return link;
    }
    return '';
  }

  function focusBatchPanel() {
    document.getElementById('batch-invite-panel')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  function focusDraftEditor() {
    const el = document.getElementById('invite-draft-textarea');
    if (el instanceof HTMLTextAreaElement) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus();
    }
  }

  function editRecipientDetails() {
    setError(null);
    setStep('research');
  }

  function applyPathwayResearch(payload: InvitePathwayApplyPayload) {
    if (payload.name) setName(payload.name);
    if (payload.email) setEmail(payload.email);
    const pathwayLinkedIn =
      payload.linkedin_url?.trim() || firstLinkedInUrl(payload.extra_links || []);
    if (pathwayLinkedIn && !linkedinUrl.trim()) {
      setLinkedinUrl(pathwayLinkedIn);
    }
    if (payload.previous_interaction) {
      setPreviousInteraction((prev) =>
        prev.trim()
          ? `${prev.trim()}\n\n${payload.previous_interaction.trim()}`
          : payload.previous_interaction.trim(),
      );
    }
    if (payload.extra_links?.length) {
      const existing = parseExtraLinks();
      const merged = [...existing];
      for (const link of payload.extra_links) {
        if (link && !merged.includes(link)) merged.push(link);
      }
      setExtraLinks(merged.join('\n'));
    }
    if (payload.zoho_contact_context) {
      setZohoContactContext(payload.zoho_contact_context);
    }
    setError(null);
  }

  async function applyZohoContact(
    contact: ZohoContactCandidate,
    prefillMap?: Record<string, { draft: string; primaryWorkgroupId?: string }>,
  ): Promise<boolean> {
    const prefillSource = prefillMap ?? batchPrefill;
    const emailKey = contact.email.trim().toLowerCase();
    const prefill = prefillSource[emailKey];
    const hasPrefillDraft = Boolean(prefill?.draft?.trim());

    if (hasPrefillDraft) {
      applyPathwayResearch(buildPathwayPayloadFromZohoContact(contact));
    } else {
      const payload = await adminInvitePathwayApply({ zoho_contact: contact });
      applyPathwayResearch(payload);
    }

    setMessageStrategy(strategyFromContact(contact));
    if (prefill?.primaryWorkgroupId) {
      setPrimaryWorkgroupId(prefill.primaryWorkgroupId);
    } else {
      setPrimaryWorkgroupId('');
    }

    if (hasPrefillDraft) {
      setDraft(prefill!.draft.trim());
      setStrategyConfirmed(true);
      await ensureWorkgroupCatalog();
      setStep('draft');
      return true;
    }

    setStrategyConfirmed(false);
    await ensureWorkgroupCatalog();
    setStep('draft');
    return false;
  }

  async function startBatchReview(
    contacts: ZohoContactCandidate[],
    prefill?: Record<string, { draft: string; primaryWorkgroupId?: string }>,
  ) {
    if (!contacts.length) return;
    resetInvite();
    const prefillMap = prefill || {};
    setBatchQueue(contacts);
    setBatchIndex(0);
    setBatchPrefill(prefillMap);
    try {
      const loadedDraft = await applyZohoContact(contacts[0], prefillMap);
      const history = await adminInviteBatchHistory({
        recipient_emails: contacts.map((row) => row.email),
      });
      const flat = Object.values(history.history_by_email || {}).flat();
      if (flat.length) {
        setSendHistory((prev) => {
          const seen = new Set(prev.map((row) => row.id));
          const merged = [...prev];
          for (const row of flat) {
            if (!seen.has(row.id)) merged.push(row);
          }
          return merged.sort((a, b) =>
            (b.created_at || '').localeCompare(a.created_at || ''),
          );
        });
      }
      if (!loadedDraft) {
        setStep('draft');
      }
      requestAnimationFrame(() => {
        focusBatchPanel();
        if (loadedDraft) focusDraftEditor();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start batch review');
    }
  }

  async function advanceBatch(status: 'sent' | 'skipped') {
    const current = batchQueue[batchIndex];
    if (current && status === 'skipped') {
      await adminInviteBatchRecord({
        recipient_email: current.email,
        recipient_name: current.name,
        primary_workgroup_id: primaryWorkgroupId || undefined,
        workgroup_ids: selectedExtraIds,
        body: draft.trim() || undefined,
        status: 'skipped',
        source: 'zoho_batch',
        message_strategy: messageStrategy,
      });
    }
    const nextIndex = batchIndex + 1;
    if (nextIndex >= batchQueue.length) {
      setBatchQueue([]);
      setBatchIndex(0);
      setPlatformDone(true);
      setStep('done');
      const history = await adminInviteSendRecords({ limit: 20 });
      setSendHistory(history.records || []);
      return;
    }
    setBatchIndex(nextIndex);
    setPlatformDone(false);
    setDraft('');
    setStrategyConfirmed(false);
    const nextContact = batchQueue[nextIndex];
    const loadedDraft = await applyZohoContact(nextContact, batchPrefill);
    if (!loadedDraft) {
      setStep('draft');
    }
    requestAnimationFrame(() => {
      focusBatchPanel();
      if (loadedDraft) focusDraftEditor();
    });
  }

  async function skipBatchContact() {
    setSendBusy(true);
    setError(null);
    try {
      await advanceBatch('skipped');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Skip failed');
    } finally {
      setSendBusy(false);
    }
  }

  function renderInviteWorkflow() {
    return (
      <>
        {step === 'research' || step === 'disambiguate' ? (
          <>
            {step === 'research' && hasDraft ? (
              <div className="mb-4 flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-400">
                  Editing recipient details. Your draft is saved below – regenerate after changes if
                  needed.
                </p>
                <button
                  type="button"
                  disabled={anyBusy}
                  onClick={() => setStep('draft')}
                  className="shrink-0 rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:border-cyan-600 disabled:opacity-50"
                >
                  Back to draft
                </button>
              </div>
            ) : null}
            <WorkgroupInviteResearchForm
              name={name}
              email={email}
              linkedinUrl={linkedinUrl}
              previousInteraction={previousInteraction}
              extraLinks={extraLinks}
              busy={draftBusy}
              onChange={(patch) => {
                if (patch.name !== undefined) setName(patch.name);
                if (patch.email !== undefined) setEmail(patch.email);
                if (patch.linkedinUrl !== undefined) setLinkedinUrl(patch.linkedinUrl);
                if (patch.previousInteraction !== undefined) {
                  setPreviousInteraction(patch.previousInteraction);
                }
                if (patch.extraLinks !== undefined) setExtraLinks(patch.extraLinks);
              }}
              onSubmit={() => void runResearch()}
            />
            {step === 'disambiguate' ? (
              <div className="mt-6">
                <WorkgroupInviteDisambiguation
                  candidates={candidates}
                  busy={draftBusy}
                  onSelect={(index) => void runResearch(index)}
                  onContinueAnyway={() => void continueToDraftFromForm()}
                />
              </div>
            ) : null}
          </>
        ) : null}

        {step === 'workgroups' ? (
          <AdminInviteWorkgroupPicker
            matches={workgroupMatches}
            catalog={workgroupCatalog}
            primaryId={primaryWorkgroupId}
            extraIds={selectedExtraIds}
            busy={draftBusy}
            researchWarnings={researchWarnings}
            onPrimaryChange={setPrimaryWorkgroupId}
            onToggleExtra={toggleExtra}
            onContinue={() => void runDraft()}
            onEditRecipient={editRecipientDetails}
          />
        ) : null}

        {showDraftPhase ? (
          <div className="space-y-6">
            {researchWarnings.length && step === 'draft' ? (
              <div className="rounded-lg border border-amber-800/50 bg-amber-950/30 px-3 py-2.5 text-sm text-amber-100/90">
                <p className="font-medium text-amber-200">Research limitations</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-amber-100/85">
                  {researchWarnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="flex flex-col gap-3 rounded-lg border border-cyan-900/40 bg-cyan-950/25 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-cyan-50/95">
                <span className="text-cyan-200/70">Inviting </span>
                <span className="font-medium text-white">{recipientLabel}</span>
                {recipientEmail ? (
                  <>
                    {' '}
                    <span className="text-cyan-100/80">&lt;{recipientEmail}&gt;</span>
                  </>
                ) : null}
              </p>
              {step === 'draft' && !platformDone ? (
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={anyBusy}
                    onClick={() => setStep('workgroups')}
                    className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:border-cyan-600 disabled:opacity-50"
                  >
                    Edit workgroups
                  </button>
                  <button
                    type="button"
                    disabled={anyBusy}
                    onClick={editRecipientDetails}
                    className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:border-cyan-600 disabled:opacity-50"
                  >
                    Edit recipient
                  </button>
                </div>
              ) : null}
            </div>
            <WorkgroupInviteDraftEditor
              tone={tone}
              length={length}
              draft={draft}
              suggested={[]}
              selectedExtraIds={selectedExtraIds}
              priorInvitations={priorInvitations}
              busy={draftBusy}
              onTone={setTone}
              onLength={setLength}
              onDraft={setDraft}
              onToggleExtra={toggleExtra}
              onRegenerate={(t, l) => void runDraft({ tone: t, length: l, regenerate: true })}
            />
            <WorkgroupInviteSendConfirm
              sendBusy={sendBusy}
              draftBusy={draftBusy}
              platformDone={platformDone || step === 'done'}
              mailto={mailto}
              subject={mailSubject}
              body={mailBody}
              recipientName={recipientLabel}
              recipientEmail={recipientEmail}
              onPlatformSend={() => send('platform')}
              onClientPrepare={() => send('client')}
              onEditDraft={focusDraftEditor}
            />
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Email invites</h2>
          <p className="mt-1 text-sm text-slate-400">
            Research a contact, pick the best-matching workgroups, then draft and send a personal
            invitation without starting from a specific DP page.
          </p>
        </div>
        {step !== 'research' || name.trim() || email.trim() ? (
          <button
            type="button"
            disabled={anyBusy}
            onClick={resetInvite}
            className="shrink-0 rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-400 disabled:opacity-50"
          >
            Start over
          </button>
        ) : null}
      </div>

      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

      {inBatchMode ? (
        <AdminInviteBatchReview
          batchQueue={batchQueue}
          batchIndex={batchIndex}
          messageStrategy={messageStrategy}
          strategyConfirmed={strategyConfirmed}
          draft={draft}
          tone={tone}
          length={length}
          primaryWorkgroupId={primaryWorkgroupId}
          selectedExtraIds={selectedExtraIds}
          workgroupCatalog={workgroupCatalog}
          priorInvitations={priorInvitations}
          platformDone={platformDone}
          sendBusy={sendBusy}
          draftBusy={draftBusy}
          mailto={mailto}
          mailSubject={mailSubject}
          mailBody={mailBody}
          onMessageStrategyChange={(strategy) => {
            setMessageStrategy(strategy);
            setStrategyConfirmed(false);
          }}
          onStrategyConfirmedChange={setStrategyConfirmed}
          onDraft={setDraft}
          onTone={setTone}
          onLength={setLength}
          onPrimaryWorkgroupChange={setPrimaryWorkgroupId}
          onToggleExtra={toggleExtra}
          onRegenerate={(t, l) => void runDraft({ tone: t, length: l, regenerate: true })}
          onGenerateDraft={() => void runDraft()}
          onPlatformSend={() => send('platform')}
          onClientPrepare={() => send('client')}
          onSkip={() => void skipBatchContact()}
          onFocusDraft={focusDraftEditor}
        />
      ) : null}

      {sendHistory.length > 0 ? (
        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/30 px-4 py-3">
          <p className="text-sm font-medium text-slate-200">Recent send log</p>
          <ul className="mt-2 space-y-2">
            {sendHistory.slice(0, 8).map((row) => (
              <li key={row.id} className="text-xs text-slate-400">
                <span className="text-slate-200">{row.recipient_name || row.recipient_email}</span>
                {' · '}
                <span>{row.status}</span>
                {row.created_at ? (
                  <>
                    {' · '}
                    <span>{new Date(row.created_at).toLocaleString()}</span>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!inBatchMode ? (
        <div className="mt-6">
          <AdminInviteResearchPathways
            onApply={applyPathwayResearch}
            onStartBatch={(contacts) => void startBatchReview(contacts)}
            removedFromSelection={selectionRemovals}
          />
        </div>
      ) : null}

      {!inBatchMode ? (
        <div className="mt-6">
          <WorkgroupInviteContentPicker
            selectedEventIds={selectedEventIds}
            selectedPerspectiveIds={selectedPerspectiveIds}
            lead={inviteLead}
            onChange={handleInviteContentChange}
            catalog={contentCatalog}
            catalogLoading={contentCatalogLoading}
            catalogError={contentCatalogError}
          />
        </div>
      ) : null}

      {!inBatchMode ? <div className="mt-6">{renderInviteWorkflow()}</div> : null}
    </div>
  );
}
