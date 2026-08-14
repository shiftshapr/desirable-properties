'use client';

import type { ContributionDraft, ContributionProposal } from '@/lib/hermesContribution';
import { patchModeFromPayload, proposalLabel } from '@/lib/hermesContribution';

interface HermesContributionPanelProps {
  draft: ContributionDraft | null;
  busy?: boolean;
  onConfirm: () => void;
  onStage: () => void;
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
  onConfirm,
  onStage,
  onCancel,
  onDraftChange,
}: HermesContributionPanelProps) {
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

  return (
    <div className="rounded-xl border border-amber-700/50 bg-amber-950/30 p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
          Proposals for review ({scopeLabel})
        </p>
        <p className="mt-1 text-sm font-medium text-white">{draft.title}</p>
        <p className="mt-1 text-xs text-slate-300">{draft.summary}</p>
        <p className="mt-1 text-[11px] text-slate-400">Target: {draft.draftRef}</p>
      </div>

      <p className="mt-3 text-xs text-amber-100/90">
        Review each patch or insert below. Submit now, stage for later, or edit before posting to
        Canopi Discuss on the book.
      </p>

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
                    (above anchor paragraph)
                  </span>
                ) : null}
              </p>

              {isPatch ? (
                <label className="mt-2 block">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    Anchor paragraph
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
          onClick={onConfirm}
          disabled={busy || !allValid}
          className="rounded-lg bg-cyan-700 px-4 py-2 text-xs font-medium text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Submitting…' : `Submit ${proposals.length} to Canopi Discuss`}
        </button>
        <button
          type="button"
          onClick={onStage}
          disabled={busy || !allValid}
          className="rounded-lg border border-violet-600 px-4 py-2 text-xs font-medium text-violet-200 hover:bg-violet-950/40 disabled:opacity-50"
        >
          Stage as Discuss drafts
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
