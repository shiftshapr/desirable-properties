type Props = {
  removed?: string | null;
  added?: string | null;
  mode?: 'replace' | 'insert' | 'patch' | 'comment' | null;
};

/**
 * Resulting text after a patch/insert would be applied.
 * INSERT: inserted text above the selection (anchor).
 * PATCH/replace: the replacement text.
 */
export default function ActivityUpdatedText({ removed, added, mode }: Props) {
  const removedText = (removed || '').trim();
  const addedText = (added || '').trim();
  if (!removedText && !addedText) return null;

  const isInsert = mode === 'insert';

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">
        {isInsert ? 'Insert above selection' : 'Updated text'}
      </p>
      {addedText ? (
        <pre className="whitespace-pre-wrap break-words rounded border border-slate-700 bg-slate-900/80 px-3 py-2 font-mono text-xs leading-relaxed text-slate-100">
          {addedText}
        </pre>
      ) : null}
      {isInsert && removedText ? (
        <>
          <p className="text-[11px] uppercase tracking-wide text-slate-500">
            Selection (unchanged below)
          </p>
          <pre className="whitespace-pre-wrap break-words rounded border border-slate-800 bg-slate-950/60 px-3 py-2 font-mono text-xs leading-relaxed text-slate-400">
            {removedText}
          </pre>
        </>
      ) : null}
    </div>
  );
}
