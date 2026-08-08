'use client';

import { useState } from 'react';
import ActivityDiffBlock from '@/components/workgroup/ActivityDiffBlock';
import ActivityUpdatedText from '@/components/workgroup/ActivityUpdatedText';

type Props = {
  removed?: string | null;
  added?: string | null;
  mode?: 'replace' | 'insert' | 'patch' | 'comment' | null;
};

type ViewMode = 'diff' | 'updated';

/** Per-item Diff vs As-updated toggle for patch/insert activity rows. */
export default function ActivityPatchPreview({ removed, added, mode }: Props) {
  const [view, setView] = useState<ViewMode>('diff');
  const removedText = (removed || '').trim();
  const addedText = (added || '').trim();
  if (!removedText && !addedText) return null;

  if (mode === 'comment') {
    return (
      <div className="mt-2">
        <ActivityDiffBlock removed={removed} added={added} mode={mode} />
      </div>
    );
  }

  return (
    <div className="mt-2">
      <div
        className="mb-1.5 inline-flex rounded-md border border-slate-700 bg-slate-950/60 p-0.5 text-[11px]"
        role="group"
        aria-label="Patch view"
      >
        <button
          type="button"
          onClick={() => setView('diff')}
          className={`rounded px-2 py-0.5 ${
            view === 'diff' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Diff
        </button>
        <button
          type="button"
          onClick={() => setView('updated')}
          className={`rounded px-2 py-0.5 ${
            view === 'updated' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          As updated
        </button>
      </div>
      {view === 'diff' ? (
        <ActivityDiffBlock removed={removed} added={added} mode={mode} />
      ) : (
        <ActivityUpdatedText removed={removed} added={added} mode={mode} />
      )}
    </div>
  );
}
