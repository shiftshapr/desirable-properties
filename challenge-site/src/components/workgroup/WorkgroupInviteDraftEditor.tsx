'use client';

import type { PriorInvitation, SuggestedWorkgroup } from '@/lib/workgroup-collab-types';

const TONES = [
  { key: 'warm', label: 'Warm' },
  { key: 'professional', label: 'Professional' },
  { key: 'direct', label: 'Direct' },
] as const;

const LENGTHS = [
  { key: 'short', label: 'Short' },
  { key: 'medium', label: 'Medium' },
  { key: 'long', label: 'Long' },
] as const;

type Props = {
  tone: string;
  length: string;
  draft: string;
  suggested: SuggestedWorkgroup[];
  selectedExtraIds: string[];
  priorInvitations?: PriorInvitation[];
  busy?: boolean;
  onTone: (tone: string) => void;
  onLength: (length: string) => void;
  onDraft: (draft: string) => void;
  onToggleExtra: (workgroupId: string) => void;
  onRegenerate: () => void;
};

export default function WorkgroupInviteDraftEditor({
  tone,
  length,
  draft,
  suggested,
  selectedExtraIds,
  priorInvitations,
  busy,
  onTone,
  onLength,
  onDraft,
  onToggleExtra,
  onRegenerate,
}: Props) {
  return (
    <div className="space-y-4">
      {priorInvitations && priorInvitations.length > 0 ? (
        <p className="rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-100/90">
          Prior invitation on file ({priorInvitations[0].status || 'pending'}
          {priorInvitations[0].created_at ? ` · ${priorInvitations[0].created_at.slice(0, 10)}` : ''}).
          The draft may acknowledge this.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-4">
        <fieldset>
          <legend className="text-xs uppercase tracking-wide text-slate-500">Tone</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {TONES.map((t) => (
              <button
                key={t.key}
                type="button"
                disabled={busy}
                onClick={() => onTone(t.key)}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  tone === t.key
                    ? 'bg-cyan-700 text-white'
                    : 'border border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-xs uppercase tracking-wide text-slate-500">Length</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {LENGTHS.map((l) => (
              <button
                key={l.key}
                type="button"
                disabled={busy}
                onClick={() => onLength(l.key)}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  length === l.key
                    ? 'bg-cyan-700 text-white'
                    : 'border border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {suggested.length > 0 ? (
        <fieldset>
          <legend className="text-sm text-slate-300">Also invite to</legend>
          <ul className="mt-2 space-y-2">
            {suggested.map((wg) => (
              <li key={wg.workgroup_id}>
                <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={selectedExtraIds.includes(wg.workgroup_id)}
                    onChange={() => onToggleExtra(wg.workgroup_id)}
                    disabled={busy}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium text-white">{wg.name}</span>
                    {wg.rationale ? (
                      <span className="mt-0.5 block text-xs text-slate-500">{wg.rationale}</span>
                    ) : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      ) : null}

      <label className="block text-sm">
        <span className="text-slate-300">Email draft</span>
        <textarea
          id="invite-draft-textarea"
          value={draft}
          onChange={(e) => onDraft(e.target.value)}
          rows={12}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100"
          disabled={busy}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRegenerate}
          disabled={busy}
          className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:border-cyan-600 disabled:opacity-50"
        >
          {busy ? 'Drafting…' : 'Regenerate draft'}
        </button>
      </div>
    </div>
  );
}
