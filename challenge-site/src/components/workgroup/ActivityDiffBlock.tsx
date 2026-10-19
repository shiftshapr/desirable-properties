import type { ReactNode } from 'react';
import { buildDiffOps, changeCounts } from '@/lib/textDiff';

type Props = {
  removed?: string | null;
  added?: string | null;
  mode?: 'replace' | 'insert' | 'patch' | 'comment' | null;
  /** INSERT: where the text goes relative to the anchored passage (default above). */
  insertPosition?: 'above' | 'below' | null;
};

function DiffPre({ children }: { children: ReactNode }) {
  return (
    <pre className="dp-proposal-pre mb-0 whitespace-pre-wrap break-words rounded border border-slate-700 bg-slate-900/80 px-3 py-2 font-mono text-xs leading-relaxed text-slate-100">
      {children}
    </pre>
  );
}

function DiffLegend({ original, proposed }: { original: string; proposed: string }) {
  const { added, removed } = changeCounts(original, proposed);
  if (added === 0 && removed === 0) return null;
  return (
    <div className="gh-patch-diff-legend mt-1 text-[11px] text-slate-500">
      {added > 0 ? <span className="gh-patch-diff-added text-emerald-400">+{added}</span> : null}
      {removed > 0 ? (
        <span className="gh-patch-diff-removed ml-2 text-rose-400">−{removed}</span>
      ) : null}
    </div>
  );
}

function InlineDiff({ original, proposed }: { original: string; proposed: string }) {
  const ops = buildDiffOps(original, proposed);
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

/** Inline word-level diff preview for patch/insert proposals (Gov Hub style). */
export default function ActivityDiffBlock({ removed, added, mode, insertPosition }: Props) {
  const original = (removed || '').trim();
  const proposed = (added || '').trim();
  if (!original && !proposed) return null;

  if (mode === 'comment') {
    return (
      <div className="gh-patch-diff space-y-1.5">
        <p className="text-[11px] uppercase tracking-wide text-slate-500">Comment</p>
        {proposed ? <DiffPre>{proposed}</DiffPre> : null}
      </div>
    );
  }

  if (mode === 'insert') {
    const below = insertPosition === 'below';
    const inserted = proposed ? <mark className="dp-diff-ins">{proposed}</mark> : null;
    const anchor = original ? <span className="text-slate-500">{original}</span> : null;
    return (
      <div className="gh-patch-diff space-y-1.5">
        <p className="text-[11px] uppercase tracking-wide text-slate-500">
          {original
            ? `Inserted ${below ? 'below' : 'above'} the anchored passage (grey, unchanged)`
            : `Text to insert ${below ? 'below' : 'above'} selection · anchored passage not recorded`}
        </p>
        <DiffPre>
          {below ? anchor : inserted}
          {anchor && inserted ? '\n\n' : null}
          {below ? inserted : anchor}
        </DiffPre>
        {proposed ? (
          <div className="gh-patch-diff-legend mt-1 text-[11px] text-emerald-400">
            +{proposed.split(/\s+/).filter(Boolean).length} words
          </div>
        ) : null}
      </div>
    );
  }

  if (!original) {
    return (
      <div className="gh-patch-diff space-y-1.5">
        <p className="text-[11px] uppercase tracking-wide text-slate-500">
          Replacement text · anchored passage not recorded
        </p>
        {proposed ? <DiffPre>{proposed}</DiffPre> : null}
      </div>
    );
  }

  return (
    <div className="gh-patch-diff space-y-1.5">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">
        Changes to the anchored passage
      </p>
      <DiffPre>
        <InlineDiff original={original} proposed={proposed} />
      </DiffPre>
      <DiffLegend original={original} proposed={proposed} />
    </div>
  );
}
