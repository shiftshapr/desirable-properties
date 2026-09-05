'use client';

import { useEffect, useMemo, useState } from 'react';
import AstraMarkdown from '@/components/astra/AstraMarkdown';
import { sanitizeAstraMarkdown } from '@/lib/astra-display';
import {
  buildMarkdownSectionDiffs,
  changeCounts,
  type DiffOp,
} from '@/lib/textDiff';
import {
  countActiveChapterEdits,
  getLatestActiveChapterEdit,
  summarizeMarkdownEdit,
  type WorkgroupChapterEditList,
} from '@/lib/workgroup-chapter-edit-types';

type ViewMode = 'changes' | 'clean';

type Props = {
  editState: WorkgroupChapterEditList;
  /** Bump when a new edit is saved so track-changes view is selected again. */
  editRevision?: number;
};

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function DiffOpsView({ ops }: { ops: DiffOp[] }) {
  return (
    <>
      {ops.map((op, idx) => {
        if (op.type === 'equal') return <span key={idx}>{op.text}</span>;
        if (op.type === 'del') {
          return (
            <del key={idx} className="dp-diff-del">
              {op.text}
            </del>
          );
        }
        return (
          <mark key={idx} className="dp-diff-ins">
            {op.text}
          </mark>
        );
      })}
    </>
  );
}

function sectionLabel(heading: string): string {
  return heading || 'Opening';
}

function SectionedChapterDiff({
  original,
  proposed,
}: {
  original: string;
  proposed: string;
}) {
  const [showUnchanged, setShowUnchanged] = useState(false);
  const { sections } = useMemo(
    () => buildMarkdownSectionDiffs(original, proposed),
    [original, proposed],
  );
  const changedSections = sections.filter((section) => section.changed);
  const unchangedSections = sections.filter((section) => !section.changed);

  return (
    <div className="space-y-3">
      {changedSections.map((section, idx) => (
        <div
          key={`${section.heading || 'preamble'}-${idx}`}
          className="rounded-lg border border-emerald-900/40 bg-slate-950/80"
        >
          <p className="border-b border-slate-800 px-4 py-2 text-xs font-semibold text-emerald-200/90">
            {section.heading ? section.heading.replace(/^##\s+/, '') : 'Opening'}
          </p>
          <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap break-words px-4 py-3 font-mono text-xs leading-relaxed text-slate-100">
            <DiffOpsView ops={section.ops} />
          </pre>
        </div>
      ))}

      {unchangedSections.length > 0 ? (
        <div className="rounded-lg border border-slate-800 bg-slate-950/40">
          <button
            type="button"
            onClick={() => setShowUnchanged((open) => !open)}
            className="flex w-full items-center justify-between px-4 py-2 text-left text-xs text-slate-400 hover:text-slate-200"
          >
            <span>
              {unchangedSections.length} unchanged section
              {unchangedSections.length === 1 ? '' : 's'}
            </span>
            <span>{showUnchanged ? 'Hide' : 'Show'}</span>
          </button>
          {showUnchanged ? (
            <ul className="border-t border-slate-800 px-4 py-2 text-xs text-slate-500">
              {unchangedSections.map((section, idx) => (
                <li key={`${section.heading || 'preamble'}-unchanged-${idx}`}>
                  {sectionLabel(section.heading)}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ViewToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  return (
    <div
      className="inline-flex rounded-lg border border-slate-700 bg-slate-950/80 p-0.5"
      role="group"
      aria-label="Chapter view mode"
    >
      <button
        type="button"
        onClick={() => onChange('changes')}
        aria-pressed={mode === 'changes'}
        className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
          mode === 'changes'
            ? 'bg-emerald-950/70 text-emerald-100 ring-1 ring-emerald-800/60'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        Track changes
      </button>
      <button
        type="button"
        onClick={() => onChange('clean')}
        aria-pressed={mode === 'clean'}
        className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
          mode === 'clean'
            ? 'bg-cyan-950/70 text-cyan-100 ring-1 ring-cyan-800/60'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        Clean read
      </button>
    </div>
  );
}

export default function WorkgroupMemberChapterView({ editState, editRevision = 0 }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('changes');

  const latestEdit = useMemo(
    () => getLatestActiveChapterEdit(editState.edits),
    [editState.edits],
  );
  const activeEditCount = useMemo(
    () => countActiveChapterEdits(editState.edits),
    [editState.edits],
  );

  const baselineMarkdown = editState.baseMarkdown;
  const effectiveMarkdown = editState.effectiveMarkdown;
  const diffSummary = useMemo(
    () => summarizeMarkdownEdit(baselineMarkdown, effectiveMarkdown),
    [baselineMarkdown, effectiveMarkdown],
  );
  const { added, removed } = useMemo(
    () => changeCounts(baselineMarkdown, effectiveMarkdown),
    [baselineMarkdown, effectiveMarkdown],
  );

  useEffect(() => {
    if (editState.hasMemberEdits) {
      setViewMode('changes');
    }
  }, [editRevision, editState.hasMemberEdits, latestEdit?.id]);

  const showChanges = viewMode === 'changes';

  return (
    <div className="space-y-4">
      {latestEdit ? (
        <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/20 px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300/90">
                Member edit applied
              </p>
              <p className="mt-1 text-sm font-medium text-white">
                {latestEdit.authorName}
                <span className="font-normal text-slate-400"> · {formatWhen(latestEdit.createdAt)}</span>
              </p>
              {latestEdit.rationale ? (
                <p className="mt-2 text-sm text-slate-300">{latestEdit.rationale}</p>
              ) : null}
              <p className="mt-2 text-xs text-slate-500">
                {diffSummary}
                {added > 0 || removed > 0 ? (
                  <>
                    {' '}
                    ·{' '}
                    {added > 0 ? (
                      <span className="text-emerald-400">+{added} chars added</span>
                    ) : null}
                    {added > 0 && removed > 0 ? ' · ' : null}
                    {removed > 0 ? (
                      <span className="text-rose-400">−{removed} chars removed</span>
                    ) : null}
                  </>
                ) : null}
              </p>
              {activeEditCount > 1 ? (
                <p className="mt-1 text-xs text-slate-500">
                  {activeEditCount} active member edits · showing latest
                </p>
              ) : null}
            </div>
            <ViewToggle mode={viewMode} onChange={setViewMode} />
          </div>
        </div>
      ) : null}

      {showChanges ? (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">
            Compared to Astra baseline · changed sections only ·{' '}
            <span className="text-emerald-400/90">green = added</span>
            {' · '}
            <span className="text-rose-400/90">red strikeout = removed</span>
          </p>
          <SectionedChapterDiff original={baselineMarkdown} proposed={effectiveMarkdown} />
        </div>
      ) : (
        <AstraMarkdown markdown={sanitizeAstraMarkdown(effectiveMarkdown)} />
      )}
    </div>
  );
}
