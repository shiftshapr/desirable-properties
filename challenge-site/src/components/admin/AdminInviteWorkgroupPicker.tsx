'use client';

import type { WorkgroupCatalogEntry, WorkgroupMatch } from '@/lib/workgroup-collab-types';

function confidenceClass(conf: WorkgroupMatch['confidence']) {
  if (conf === 'high') return 'border-emerald-700/50 bg-emerald-950/40 text-emerald-200';
  if (conf === 'medium') return 'border-amber-700/50 bg-amber-950/40 text-amber-200';
  return 'border-slate-700 bg-slate-900/60 text-slate-300';
}

type Props = {
  matches: WorkgroupMatch[];
  catalog: WorkgroupCatalogEntry[];
  primaryId: string;
  extraIds: string[];
  busy?: boolean;
  researchWarnings?: string[];
  continueDisabled?: boolean;
  continueHint?: string;
  onPrimaryChange: (workgroupId: string) => void;
  onToggleExtra: (workgroupId: string) => void;
  onContinue: () => void;
  onEditRecipient?: () => void;
};

export default function AdminInviteWorkgroupPicker({
  matches,
  catalog,
  primaryId,
  extraIds,
  busy,
  researchWarnings,
  continueDisabled,
  continueHint,
  onPrimaryChange,
  onToggleExtra,
  onContinue,
  onEditRecipient,
}: Props) {
  const catalogById = new Map(catalog.map((entry) => [entry.id, entry]));
  const orderedMatches = matches.length
    ? matches
    : catalog.map((entry) => ({
        workgroup_id: entry.id,
        name: entry.name,
        slug: entry.slug,
        confidence: 'medium' as const,
        score: 0,
        rationale: entry.description || '',
      }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Recommended workgroups</h3>
          <p className="mt-1 text-sm text-slate-400">
            Choose the lead workgroup for this invitation, then optionally add others to mention in
            the same email.
          </p>
        </div>
        {onEditRecipient ? (
          <button
            type="button"
            disabled={busy}
            onClick={onEditRecipient}
            className="shrink-0 rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:border-cyan-600 disabled:opacity-50"
          >
            Edit recipient
          </button>
        ) : null}
      </div>

      {researchWarnings?.length ? (
        <div className="rounded-lg border border-amber-800/50 bg-amber-950/30 px-3 py-2.5 text-sm text-amber-100/90">
          <p className="font-medium text-amber-200">Research limitations</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-amber-100/85">
            {researchWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {orderedMatches.length > 0 ? (
        <ul className="space-y-3">
          {orderedMatches.map((match) => (
            <li
              key={match.workgroup_id}
              className="rounded-lg border border-slate-800 bg-slate-950/50 p-4"
            >
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="radio"
                  name="admin-invite-primary"
                  checked={primaryId === match.workgroup_id}
                  onChange={() => onPrimaryChange(match.workgroup_id)}
                  disabled={busy}
                  className="mt-1"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-white">{match.name}</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${confidenceClass(match.confidence)}`}
                    >
                      {match.confidence} · {match.score}%
                    </span>
                  </span>
                  {match.rationale ? (
                    <span className="mt-1 block text-sm text-slate-400">{match.rationale}</span>
                  ) : null}
                </span>
              </label>
              {primaryId !== match.workgroup_id ? (
                <label className="mt-3 flex cursor-pointer items-center gap-2 pl-7 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={extraIds.includes(match.workgroup_id)}
                    onChange={() => onToggleExtra(match.workgroup_id)}
                    disabled={busy}
                  />
                  Also mention this workgroup
                </label>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <label className="block text-sm">
        <span className="text-slate-300">Or choose a different primary workgroup</span>
        <select
          value={primaryId}
          onChange={(e) => onPrimaryChange(e.target.value)}
          disabled={busy}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
        >
          <option value="">Select a workgroup…</option>
          {catalog.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name}
            </option>
          ))}
        </select>
      </label>

      {primaryId && catalog.length > 1 ? (
        <fieldset>
          <legend className="text-sm text-slate-300">Also invite to</legend>
          <ul className="mt-2 max-h-56 space-y-2 overflow-y-auto rounded-lg border border-slate-800 p-3">
            {catalog
              .filter((entry) => entry.id !== primaryId)
              .map((entry) => (
                <li key={entry.id}>
                  <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={extraIds.includes(entry.id)}
                      onChange={() => onToggleExtra(entry.id)}
                      disabled={busy}
                      className="mt-1"
                    />
                    <span>
                      <span className="font-medium text-white">{entry.name}</span>
                      {entry.description ? (
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {entry.description}
                        </span>
                      ) : null}
                    </span>
                  </label>
                </li>
              ))}
          </ul>
        </fieldset>
      ) : null}

      {primaryId && catalogById.get(primaryId) ? (
        <div className="space-y-2">
          <button
            type="button"
            disabled={busy || continueDisabled}
            onClick={onContinue}
            className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
          >
            {busy ? 'Drafting…' : 'Generate email draft'}
          </button>
          {continueHint ? <p className="text-sm text-amber-200/90">{continueHint}</p> : null}
        </div>
      ) : (
        <p className="text-sm text-amber-200/90">Select a primary workgroup to continue.</p>
      )}
    </div>
  );
}
