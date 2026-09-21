'use client';

import { useMemo } from 'react';
import type {
  ContributionDraft,
  ContributionEditContext,
  ContributionProposal,
  ContributionSet,
  ContributionSubmitMode,
} from '@/lib/hermesContribution';
import {
  contributionEditContextCopy,
  contributionSubmitBlockedByJudge,
  markProposalDirty,
  patchModeFromPayload,
  proposalLabel,
  proposalsToStage,
  resolveContributionEditContext,
} from '@/lib/hermesContribution';
import HermesDraftingLoader from '@/components/HermesDraftingLoader';

interface HermesContributionPanelProps {
  draft: ContributionDraft | null;
  contributionSets?: ContributionSet[];
  busy?: boolean;
  onSubmit: (mode: ContributionSubmitMode) => void;
  onCancel: () => void;
  onDraftChange?: (draft: ContributionDraft) => void;
  onRevise?: () => void;
  revising?: boolean;
}

function proposalsFromDraft(draft: ContributionDraft): ContributionProposal[] {
  if (draft.proposals?.length) return draft.proposals;
  return [{ id: 'p0', kind: draft.kind, payload: draft.payload }];
}

export default function HermesContributionPanel({
  draft,
  contributionSets = [],
  busy = false,
  onSubmit,
  onCancel,
  onDraftChange,
  onRevise,
  revising = false,
}: HermesContributionPanelProps) {
  const editContext: ContributionEditContext = useMemo(
    () => (draft ? resolveContributionEditContext(draft, contributionSets) : 'new'),
    [draft, contributionSets],
  );
  if (!draft) return null;

  const scopeLabel =
    draft.scope === 'thread' ? 'from full thread' : 'from latest message';
  const proposals = proposalsFromDraft(draft);
  const copy = contributionEditContextCopy(editContext);
  const isEditing = editContext !== 'new';

  const updateProposal = (id: string, patch: Record<string, unknown>) => {
    if (!onDraftChange) return;
    const next = proposals.map((p) => {
      if (p.id !== id) return p;
      return {
        ...p,
        payload: { ...p.payload, ...patch },
      };
    });
    onDraftChange(markProposalDirty({
      ...draft,
      proposals: next,
      kind: next[0]?.kind || draft.kind,
      payload: next[0]?.payload || draft.payload,
    }, id));
  };

  const allValid = proposals.every((p) => {
    if (p.kind === 'patch') {
      const o = String(p.payload.original_text || '').trim();
      const proposed = String(p.payload.proposed_text || '').trim();
      const rationale = String(p.payload.rationale || '').trim();
      return Boolean(o && proposed && rationale);
    }
    const text = String(p.payload.text || '').trim();
    return Boolean(text);
  });
  const judgeBlocked = proposals.some((p) => p.kind === 'patch' && p.judgeBlocked);
  const judgeRevisedPass = proposals.some((p) => p.judgeRevised && !p.judgeBlocked);
  const blockedProposal = proposals.find((p) => p.kind === 'patch' && p.judgeBlocked);
  const revisionRounds = Number(draft.judgeSummary?.revisionRounds || 0);
  const revisionTried = revisionRounds > 0
    || proposals.some((p) => Boolean(p.judgeRevised) || Number(p.judgeAttempts || 0) > 1);
  const triedCount = revisionRounds > 0
    ? revisionRounds
    : Math.max(
      0,
      ...proposals.map((p) => Math.max(0, Number(p.judgeAttempts || 1) - 1)),
    );
  const blockReason = blockedProposal?.judgeCoaching
    || blockedProposal?.judge?.failedCriterion
    || draft.judgeSummary?.revisionError
    || 'the quality judge still rejects this patch';

  const publishMode: ContributionSubmitMode = isEditing ? 'replace' : 'publish';
  const publishBlocked = contributionSubmitBlockedByJudge(publishMode, judgeBlocked);
  const stageCount = proposalsToStage(draft, proposals).length;
  const submitCount = isEditing ? stageCount : proposals.length;
  const submitting = Boolean(busy && !revising);
  const draftDisabled = busy || !allValid || (isEditing && submitCount === 0);
  const publishDisabled = draftDisabled || publishBlocked;

  const publishLabel = (() => {
    if (submitting) return 'Submitting…';
    if (editContext === 'edit_draft') return `Replace live post (${submitCount})`;
    if (editContext === 'edit_revision' || editContext === 'draft_id_already_published') {
      return `Replace published post (${submitCount})`;
    }
    return `Publish ${proposals.length} to Canopi Discuss`;
  })();

  const draftLabel = (() => {
    if (submitting) return 'Submitting…';
    if (editContext === 'edit_draft') {
      return `Update draft${submitCount === 1 ? '' : 's'} (${submitCount})`;
    }
    if (editContext === 'edit_revision' || editContext === 'draft_id_already_published') {
      return `Save revision draft${submitCount === 1 ? '' : 's'} (${submitCount})`;
    }
    return `Save ${proposals.length} as Discuss draft${proposals.length === 1 ? '' : 's'}`;
  })();

  const actionRow = (sticky: boolean) => (
    <div
      className={`flex flex-wrap gap-2 ${
        sticky
          ? 'sticky bottom-0 z-10 -mx-4 mt-4 border-t border-amber-700/40 bg-amber-950/95 px-4 py-3 backdrop-blur'
          : 'mt-4'
      }`}
    >
      <button
        type="button"
        onClick={() => onSubmit(publishMode)}
        disabled={publishDisabled}
        title={publishBlocked ? 'Publish stays blocked until the quality judge passes' : undefined}
        className="rounded-lg bg-cyan-700 px-4 py-2 text-xs font-medium text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {publishLabel}
      </button>
      <button
        type="button"
        onClick={() => onSubmit('draft')}
        disabled={draftDisabled}
        className="rounded-lg bg-violet-700 px-4 py-2 text-xs font-medium text-white hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {draftLabel}
      </button>
      {judgeBlocked && onRevise ? (
        <button
          type="button"
          onClick={onRevise}
          disabled={busy}
          className="rounded-lg bg-amber-700 px-4 py-2 text-xs font-medium text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy || revising ? 'Deepi is revising…' : 'Ask Deepi to fix this'}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onCancel}
        disabled={busy}
        className="rounded-lg border border-slate-600 px-4 py-2 text-xs text-slate-200 hover:border-slate-500 disabled:opacity-50"
      >
        Cancel
      </button>
    </div>
  );

  return (
    <div className="rounded-xl border border-amber-700/50 bg-amber-950/30 p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
          Proposals for review ({scopeLabel})
        </p>
        <p className="mt-1 text-sm font-medium text-white">{draft.title}</p>
        {draft.recovered ? (
          <p className="mt-2 inline-flex rounded-full border border-amber-600/60 bg-amber-950/50 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-200">
            Draft recovered. Please review.
          </p>
        ) : null}
        <p className="mt-1 text-xs text-slate-300">{draft.summary}</p>
        <p className="mt-1 text-[11px] text-slate-400">Target: {draft.draftRef}</p>
        {revising ? (
          <div className="mt-3 rounded-lg border border-amber-700/40 bg-amber-950/40 px-3 py-2">
            <HermesDraftingLoader label="Deepi is revising the draft" compact />
          </div>
        ) : null}
        {judgeRevisedPass ? (
          <p className="mt-2 inline-flex rounded-full border border-cyan-600/60 bg-cyan-950/40 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-cyan-200">
            Deepi revised after the judge rejected the first home
          </p>
        ) : null}
        {judgeBlocked ? (
          <div className="mt-2 space-y-1">
            {revisionTried ? (
              <p className="text-[11px] leading-relaxed text-rose-200/90">
                Deepi tried {triedCount || revisionRounds || 1} time{(triedCount || revisionRounds || 1) === 1 ? '' : 's'}.
                Reason: {blockReason}
              </p>
            ) : (
              <p className="text-[11px] leading-relaxed text-rose-200/90">
                The quality judge rejected one or more patches. Ask Deepi to fix this, or save as a Discuss draft to keep working.
              </p>
            )}
            <p className="text-[11px] leading-relaxed text-slate-400">
              Publish to Canopi stays blocked until the judge passes. Saving a Discuss draft is still available.
            </p>
          </div>
        ) : null}
        {draft.isRevision && draft.supersedesMessageId ? (
          <p className="mt-2 inline-flex rounded-full border border-amber-600/60 bg-amber-950/50 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-200">
            Revision of published contribution
          </p>
        ) : null}
        {editContext === 'edit_draft' ? (
          <p className="mt-2 inline-flex rounded-full border border-violet-600/60 bg-violet-950/40 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-violet-200">
            Editing saved draft
          </p>
        ) : null}
      </div>

      <div className="mt-3 rounded-lg border border-amber-700/40 bg-amber-950/20 px-3 py-2.5">
        <p className="text-xs font-medium text-amber-100">{copy.headline}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-300">{copy.detail}</p>
        {editContext === 'draft_id_already_published' ? (
          <p className="mt-2 text-[11px] font-medium text-rose-200/90">
            The linked draft id is already published on Discuss. Choose Replace to update the live post, or Save as new draft to start a separate draft row.
          </p>
        ) : null}
      </div>

      {actionRow(false)}

      <div className="mt-4 space-y-4">
        {proposals.map((proposal, index) => {
          const isPatch = proposal.kind === 'patch';
          const patchMode = patchModeFromPayload(proposal.payload);
          const originalText = isPatch ? String(proposal.payload.original_text || '') : '';
          const proposedText = isPatch
            ? String(proposal.payload.proposed_text || '')
            : String(proposal.payload.text || '');
          const rationaleText = String(proposal.payload.rationale || '');

          return (
            <div
              key={proposal.id}
              className="rounded-lg border border-slate-700/80 bg-slate-950/60 p-3"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-300">
                {index + 1}. {proposalLabel(proposal)}
                {isPatch && patchMode === 'insert' ? (
                  <span className="ml-2 font-normal normal-case text-slate-400">
                    (above anchor passage)
                  </span>
                ) : null}
                {isPatch && patchMode === 'insert_after' ? (
                  <span className="ml-2 font-normal normal-case text-slate-400">
                    (below last heading in this section)
                  </span>
                ) : null}
              </p>
              {proposal.judgeRevised && !proposal.judgeBlocked ? (
                <p className="mt-1 text-[11px] text-cyan-200/90">
                  Deepi revised this after the judge objected
                  {proposal.judgeAttempts && proposal.judgeAttempts > 1
                    ? ` (${proposal.judgeAttempts} judged attempts)`
                    : ''}
                  .
                </p>
              ) : null}
              {proposal.judgeRevised && proposal.judgeBlocked ? (
                <p className="mt-1 text-[11px] text-amber-200/90">
                  Deepi revised this and the judge still objected
                  {proposal.judgeAttempts && proposal.judgeAttempts > 1
                    ? ` (${proposal.judgeAttempts} judged attempts)`
                    : ''}
                  .
                </p>
              ) : null}
              {proposal.judgeBlocked && proposal.judgeCoaching ? (
                <p className="mt-1 text-[11px] leading-relaxed text-rose-200/90">
                  Judge: {proposal.judge?.failedCriterion || 'quality'} – {proposal.judgeCoaching}
                </p>
              ) : null}

              {isPatch ? (
                <label className="mt-2 block">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    Anchor passage
                  </span>
                  <textarea
                    value={originalText}
                    onChange={(e) => updateProposal(proposal.id, { original_text: e.target.value })}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
                  />
                </label>
              ) : null}

              <label className="mt-2 block">
                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  {isPatch ? 'Proposed text' : 'Comment'}
                </span>
                <textarea
                  value={proposedText}
                  onChange={(e) =>
                    updateProposal(
                      proposal.id,
                      isPatch ? { proposed_text: e.target.value } : { text: e.target.value },
                    )
                  }
                  rows={isPatch ? 3 : 5}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
                />
              </label>

              <label className="mt-2 block">
                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Rationale (shown on hover in Discuss, not in post body)
                </span>
                <textarea
                  value={rationaleText}
                  onChange={(e) => updateProposal(proposal.id, { rationale: e.target.value })}
                  rows={8}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
                />
              </label>
            </div>
          );
        })}
      </div>

      {actionRow(true)}
    </div>
  );
}
