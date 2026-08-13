'use client';

import { useCallback, useEffect, useState } from 'react';
import WorkgroupInviteContentPicker from '@/components/workgroup/WorkgroupInviteContentPicker';
import WorkgroupInviteDisambiguation from '@/components/workgroup/WorkgroupInviteDisambiguation';
import WorkgroupInviteDraftEditor from '@/components/workgroup/WorkgroupInviteDraftEditor';
import WorkgroupInviteResearchForm from '@/components/workgroup/WorkgroupInviteResearchForm';
import WorkgroupInviteSendConfirm from '@/components/workgroup/WorkgroupInviteSendConfirm';
import { inviteAiDraft, inviteAiResearch, inviteAiSend } from '@/lib/workgroup-collab-api';
import {
  buildInviteContentContext,
  type InviteContentCatalog,
} from '@/lib/dp-invite-content-context';
import {
  clearInviteDraft,
  loadInviteDraft,
  saveInviteDraft,
} from '@/lib/workgroup-draft-storage';
import type {
  InviteCandidate,
  InviteContentContext,
  InviteLeadType,
  PriorInvitation,
  ResolvedPerson,
  SuggestedWorkgroup,
} from '@/lib/workgroup-collab-types';

type Step = 'research' | 'disambiguate' | 'draft' | 'done';

type Props = {
  workgroupId: string;
  workgroupSlug: string;
  canInvite: boolean;
};

export default function WorkgroupInviteAiPanel({ workgroupId, workgroupSlug, canInvite }: Props) {
  const [step, setStep] = useState<Step>('research');
  const [draftBusy, setDraftBusy] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [previousInteraction, setPreviousInteraction] = useState('');
  const [extraLinks, setExtraLinks] = useState('');

  const [candidates, setCandidates] = useState<InviteCandidate[]>([]);
  const [resolvedPerson, setResolvedPerson] = useState<ResolvedPerson | null>(null);
  const [suggested, setSuggested] = useState<SuggestedWorkgroup[]>([]);
  const [priorInvitations, setPriorInvitations] = useState<PriorInvitation[]>([]);
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);

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

  useEffect(() => {
    const saved = loadInviteDraft(workgroupSlug);
    if (saved) {
      if (saved.name) setName(saved.name);
      if (saved.email) setEmail(saved.email);
      if (saved.linkedinUrl) setLinkedinUrl(saved.linkedinUrl);
      if (saved.previousInteraction) setPreviousInteraction(saved.previousInteraction);
      if (saved.extraLinks) setExtraLinks(saved.extraLinks);
      if (saved.tone) setTone(saved.tone);
      if (saved.length) setLength(saved.length);
      if (saved.draft) setDraft(saved.draft);
      if (saved.step) setStep(saved.step);
      if (saved.selectedEventIds) setSelectedEventIds(saved.selectedEventIds);
      if (saved.selectedPerspectiveIds) setSelectedPerspectiveIds(saved.selectedPerspectiveIds);
      if (saved.inviteLead) setInviteLead(saved.inviteLead);
    }
    setHydrated(true);
  }, [workgroupSlug]);

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
    if (!hydrated) return;
    saveInviteDraft(workgroupSlug, {
      name,
      email,
      linkedinUrl,
      previousInteraction,
      extraLinks,
      tone,
      length,
      draft,
      step,
      selectedEventIds,
      selectedPerspectiveIds,
      inviteLead,
    });
  }, [
    draft,
    email,
    extraLinks,
    hydrated,
    inviteLead,
    length,
    linkedinUrl,
    name,
    previousInteraction,
    selectedEventIds,
    selectedPerspectiveIds,
    step,
    tone,
    workgroupSlug,
  ]);

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

  if (!canInvite) {
    return (
      <div>
        <p className="text-sm text-slate-400">
          Only workgroup members and DP site admins can invite people with the AI assistant.
        </p>
      </div>
    );
  }

  function parseExtraLinks() {
    return extraLinks
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function resetInvite() {
    clearInviteDraft(workgroupSlug);
    setStep('research');
    setDraftBusy(false);
    setSendBusy(false);
    setError(null);
    setName('');
    setEmail('');
    setLinkedinUrl('');
    setPreviousInteraction('');
    setExtraLinks('');
    setCandidates([]);
    setResolvedPerson(null);
    setSuggested([]);
    setPriorInvitations([]);
    setSelectedExtraIds([]);
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
  }

  async function runDraft(
    person: ResolvedPerson | null = resolvedPerson,
    prior: PriorInvitation[] = priorInvitations,
    manageBusy = true,
    opts?: { tone?: string; length?: string; regenerate?: boolean },
  ) {
    const effectiveTone = opts?.tone ?? tone;
    const effectiveLength = opts?.length ?? length;
    const isRegenerate = opts?.regenerate ?? false;
    if (manageBusy) setDraftBusy(true);
    setError(null);
    const previousDraft = draft;
    const hasContentSelections =
      selectedEventIds.length > 0 || selectedPerspectiveIds.length > 0;
    if (hasContentSelections && contentCatalogLoading) {
      setError('Still loading events and perspectives – try again in a moment.');
      if (manageBusy) setDraftBusy(false);
      return;
    }
    if (hasContentSelections && contentCatalogError) {
      setError(`Cannot include invite content: ${contentCatalogError}`);
      if (manageBusy) setDraftBusy(false);
      return;
    }
    const inviteContent = resolveInviteContentForDraft();
    if (hasContentSelections && !inviteContent) {
      setError(
        'Selected events or perspectives could not be resolved. Refresh the page and try again.',
      );
      if (manageBusy) setDraftBusy(false);
      return;
    }
    try {
      const data = await inviteAiDraft(workgroupId, {
        name: name.trim(),
        email: email.trim(),
        tone: effectiveTone,
        length: effectiveLength,
        previous_interaction: previousInteraction.trim() || undefined,
        resolved_person: person,
        additional_workgroup_ids: selectedExtraIds,
        prior_invitations: prior,
        invite_content: inviteContent,
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
      if (manageBusy) setDraftBusy(false);
    }
  }

  async function runResearch(selectedIndex?: number | null) {
    setDraftBusy(true);
    setError(null);
    try {
      const data = await inviteAiResearch(workgroupId, {
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
      setPriorInvitations(data.prior_invitations || []);
      setSuggested(data.suggested_workgroups || []);
      setCandidates(data.candidates || []);
      setResolvedPerson(data.resolved_person || null);
      if (data.ambiguous && selectedIndex == null) {
        setStep('disambiguate');
        return;
      }
      await runDraft(
        data.resolved_person || resolvedPerson,
        data.prior_invitations || priorInvitations,
        false,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Research failed');
    } finally {
      setDraftBusy(false);
    }
  }

  async function send(mode: 'platform' | 'client') {
    setSendBusy(true);
    setError(null);
    try {
      const data = await inviteAiSend(workgroupId, {
        name: name.trim(),
        email: email.trim(),
        body: draft.trim(),
        additional_workgroup_ids: selectedExtraIds,
        send_mode: mode,
      });
      if (data.blocked || data.error) {
        setError(data.error || 'Send failed');
        return;
      }
      if (mode === 'platform') {
        setPlatformDone(true);
        setStep('done');
        clearInviteDraft(workgroupSlug);
      } else {
        setMailto(data.mailto || '');
        setMailSubject(data.subject || '');
        setMailBody(data.body || '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
      throw err;
    } finally {
      setSendBusy(false);
    }
  }

  const anyBusy = draftBusy || sendBusy;

  const hasProgress =
    Boolean(name.trim() || email.trim() || linkedinUrl.trim() || draft.trim())
    || step !== 'research'
    || candidates.length > 0;

  const recipientLabel = name.trim() || resolvedPerson?.name || 'Recipient';
  const recipientEmail = email.trim();
  const hasDraft = Boolean(draft.trim());
  const showDraftPhase = step === 'draft' || step === 'done' || (step === 'research' && hasDraft);

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

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm text-slate-400">
          Optionally include events or perspectives, research a contact, draft a personal
          invitation, then send via platform mail or your own inbox.
        </p>
        {hasProgress ? (
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

      <div className="mt-6">
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
          </>
        ) : null}

        {step === 'disambiguate' ? (
          <div className="mt-6">
            <WorkgroupInviteDisambiguation
              candidates={candidates}
              busy={draftBusy}
              onSelect={(index) => void runResearch(index)}
            />
          </div>
        ) : null}

        {showDraftPhase ? (
          <div className="mt-6 space-y-6">
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
                <button
                  type="button"
                  disabled={anyBusy}
                  onClick={editRecipientDetails}
                  className="shrink-0 rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:border-cyan-600 disabled:opacity-50"
                >
                  Edit recipient
                </button>
              ) : null}
            </div>
            <WorkgroupInviteDraftEditor
              tone={tone}
              length={length}
              draft={draft}
              suggested={suggested}
              selectedExtraIds={selectedExtraIds}
              priorInvitations={priorInvitations}
              busy={draftBusy}
              onTone={(t) => setTone(t)}
              onLength={(l) => setLength(l)}
              onDraft={setDraft}
              onToggleExtra={(id) =>
                setSelectedExtraIds((prev) =>
                  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
                )
              }
              onRegenerate={(t, l) =>
                void runDraft(undefined, undefined, true, {
                  tone: t,
                  length: l,
                  regenerate: true,
                })
              }
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
      </div>
    </div>
  );
}
