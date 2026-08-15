'use client';

import { useState } from 'react';
import type { ContributionDraft, ContributionProposal, ContributionSubmitMode } from '@/lib/hermesContribution';
import { patchModeFromPayload, proposalLabel } from '@/lib/hermesContribution';

interface HermesContributionPanelProps {
  draft: ContributionDraft | null;
  busy?: boolean;
  onSubmit: (mode: ContributionSubmitMode) => void;
  onCancel: () => void;
  onDraftChange?: (draft: ContributionDraft) => void;
}

function proposalsFromDraft(draft: ContributionDraft): ContributionProposal[] {
  if (draft.proposals?.length) return draft.proposals;
  return [{ id: 'p0', kind: draft.kind, payload: draft.payload }];
}

export default function HermesContributionPanel({
  draft,
  busy = false,
  onSubmit,
  onCancel,
  onDraftChange,
}: HermesContributionPanelProps) {
  const [submitMode, setSubmitMode] = useState<ContributionSubmitMode>('draft');

  if (!draft) return null;

  const scopeLabel =
    draft.scope === 'thread' ? 'from full thread' : 'from latest message';
  const proposals = proposalsFromDraft(draft);

  const updateProposal = (id: string, patch: Record<string, unknown>) => {
    if (!onDraftChange) return;
    const next = proposals.map((p) =>
      p.id === id ? { ...p, payload: { ...p.payload, ...patch } } : p,
    );
    onDraftChange({
      ...draft,
      proposals: next,
      kind: next[0]?.kind || draft.kind,
      payload: next[0]?.payload || draft.payload,
    });
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

  const submitLabel =
    submitMode === 'draft'
      ? `Save ${proposals.length} as Discuss draft${proposals.length === 1 ? '' : 's'}`
      : `Publish ${proposals.length} to Canopi Discuss`;

  return (
    <div className="rounded-xl border border-amber-700/50 bg-amber-950/30 p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
          Proposals for review ({scopeLabel})
        </p>
        <p className="mt-1 text-sm font-medium text-white">{draft.title}</p>
        {draft.recovered ? (
          <p className="mt-2 inline-flex rounded-full border border-amber-600/60 bg-amber-950/50 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-200">
            Draft recovered — please review
          </p>
        ) : null}
        <p className="mt-1 text-xs text-slate-300">{draft.summary}</p>
        <p className="mt-1 text-[11px] text-slate-400">Target: {draft.draftRef}</p>
        {draft.isRevision && draft.supersedesMessageId ? (
          <p className="mt-2 inline-flex rounded-full border border-amber-600/60 bg-amber-950/50 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-200">
            Revision of published contribution
          </p>
        ) : null}
      </div>

      <p className="mt-3 text-xs text-amber-100/90">
        Review each patch or insert below. Choose whether to save drafts you can edit in Discuss,
        or publish immediately.
      </p>

      <fieldset className="mt-4 space-y-2">
        <legend className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          When you submit
        </legend>
        <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-700/80 bg-slate-950/60 px-3 py-2.5 has-[:checked]:border-violet-600/70 has-[:checked]:bg-violet-950/20">
          <input
            type="radio"
            name="contribution-submit-mode"
            value="draft"
            checked={submitMode === 'draft'}
            onChange={() => setSubmitMode('draft')}
            className="mt-0.5"
          />
          <span>
            <span className="block text-sm font-medium text-white">Save to my drafts</span>
            <span className="mt-0.5 block text-[11px] text-slate-400">
              Recommended — opens in Canopi Discuss for review before publishing.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-700/80 bg-slate-950/60 px-3 py-2.5 has-[:checked]:border-cyan-600/70 has-[:checked]:bg-cyan-950/20">
          <input
            type="radio"
            name="contribution-submit-mode"
            value="publish"
            checked={submitMode === 'publish'}
            onChange={() => setSubmitMode('publish')}
            className="mt-0.5"
          />
          <span>
            <span className="block text-sm font-medium text-white">Publish now</span>
            <span className="mt-0.5 block text-[11px] text-slate-400">
              Posts immediately to Canopi Discuss on the book.
            </span>
          </span>
        </label>
      </fieldset>

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
              </p>

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

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSubmit(submitMode)}
          disabled={busy || !allValid}
          className={`rounded-lg px-4 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 ${
            submitMode === 'draft'
              ? 'bg-violet-700 hover:bg-violet-600'
              : 'bg-cyan-700 hover:bg-cyan-600'
          }`}
        >
          {busy ? 'Submitting…' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-lg border border-slate-600 px-4 py-2 text-xs text-slate-200 hover:border-slate-500 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
