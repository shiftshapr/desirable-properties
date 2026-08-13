'use client';

import type {
  ContributionDestination,
  ContributionDraft,
  PatchMode,
} from '@/lib/hermesContribution';
import { defaultDestination, patchModeFromPayload } from '@/lib/hermesContribution';

interface HermesContributionPanelProps {
  draft: ContributionDraft | null;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onDraftChange?: (draft: ContributionDraft) => void;
}

function destinationLabel(dest: ContributionDestination) {
  return dest === 'canopi' ? 'Canopi Discuss (book)' : 'Gov Hub (formal draft)';
}

export default function HermesContributionPanel({
  draft,
  busy = false,
  onConfirm,
  onCancel,
  onDraftChange,
}: HermesContributionPanelProps) {
  if (!draft) return null;

  const scopeLabel =
    draft.scope === 'thread' ? 'from full thread' : 'from latest message';
  const destination = defaultDestination(draft);
  const patchMode = patchModeFromPayload(draft.payload);
  const isPatch = draft.kind === 'patch';

  const originalText = isPatch ? String(draft.payload.original_text || '') : '';
  const proposedText = isPatch
    ? String(draft.payload.proposed_text || '')
    : String(draft.payload.text || '');
  const rationaleText = String(draft.payload.rationale || '');

  const updatePayload = (patch: Record<string, unknown>) => {
    if (!onDraftChange) return;
    onDraftChange({ ...draft, payload: { ...draft.payload, ...patch } });
  };

  const setDestination = (dest: ContributionDestination) => {
    if (!onDraftChange) return;
    onDraftChange({ ...draft, destination: dest });
  };

  const setPatchMode = (mode: PatchMode) => {
    updatePayload({ patch_mode: mode });
  };

  const canSubmit =
    isPatch
      ? Boolean(originalText.trim() && proposedText.trim() && rationaleText.trim())
      : Boolean(proposedText.trim() || rationaleText.trim());

  return (
    <div className="rounded-xl border border-amber-700/50 bg-amber-950/30 p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
          {isPatch ? 'Patch' : 'Comment'} draft ({scopeLabel})
        </p>
        <p className="mt-1 text-sm font-medium text-white">{draft.title}</p>
        <p className="mt-1 text-xs text-slate-300">{draft.summary}</p>
        <p className="mt-1 text-[11px] text-slate-400">Target: {draft.draftRef}</p>
      </div>

      <fieldset className="mt-4">
        <legend className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
          Submit to
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {(['canopi', 'govhub'] as const).map((dest) => (
            <button
              key={dest}
              type="button"
              onClick={() => setDestination(dest)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                destination === dest
                  ? 'bg-cyan-700 text-white'
                  : 'border border-slate-600 text-slate-200 hover:border-cyan-600'
              }`}
            >
              {destinationLabel(dest)}
              {dest === 'canopi' && draft.recommendedDestination !== 'govhub' ? (
                <span className="ml-1.5 text-[10px] font-normal opacity-80">recommended</span>
              ) : null}
            </button>
          ))}
        </div>
        {draft.recommendedDestination === 'either' ? (
          <p className="mt-1 text-[11px] text-slate-400">
            Canopi Discuss is the default for book patches; switch to Gov Hub for formal ML-Draft proposals.
          </p>
        ) : draft.recommendedDestination === 'govhub' ? (
          <p className="mt-1 text-[11px] text-slate-400">
            Hermes recommends Gov Hub for this draft — Canopi Discuss is still available to test.
          </p>
        ) : null}
      </fieldset>

      {isPatch ? (
        <fieldset className="mt-4">
          <legend className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Patch mode
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(['replace', 'insert'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPatchMode(mode)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize ${
                  patchMode === mode
                    ? 'bg-violet-700 text-white'
                    : 'border border-slate-600 text-slate-200 hover:border-violet-600'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {patchMode === 'insert'
              ? 'Insert adds proposed text above the anchor passage (anchor stays in the draft).'
              : 'Replace substitutes the anchor passage with the proposed text.'}
          </p>
        </fieldset>
      ) : null}

      <p className="mt-3 text-xs text-amber-100/90">
        This will be posted publicly on {destinationLabel(destination)} under your account.
        Review all fields before submitting.
      </p>

      {isPatch ? (
        <label className="mt-3 block">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Anchor passage (from live draft)
          </span>
          <textarea
            value={originalText}
            onChange={(e) => updatePayload({ original_text: e.target.value })}
            rows={4}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
          />
        </label>
      ) : null}

      <label className="mt-3 block">
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
          {isPatch ? 'Proposed text' : 'Comment'}
        </span>
        <textarea
          value={proposedText}
          onChange={(e) =>
            updatePayload(isPatch ? { proposed_text: e.target.value } : { text: e.target.value })
          }
          rows={isPatch ? 4 : 6}
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
        />
      </label>

      <label className="mt-3 block">
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
          Rationale (required)
        </span>
        <p className="mt-0.5 text-[11px] text-slate-400">
          Why it fits, length choice, and pre-flight checks. Posted on Canopi Discuss after the patch line, or as Gov Hub rationale.
        </p>
        <textarea
          value={rationaleText}
          onChange={(e) => updatePayload({ rationale: e.target.value })}
          rows={12}
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy || !canSubmit}
          className="rounded-lg bg-cyan-700 px-4 py-2 text-xs font-medium text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy
            ? 'Submitting…'
            : `Confirm & submit to ${destinationLabel(destination)}`}
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
