type Props = {
  removed?: string | null;
  added?: string | null;
  mode?: 'replace' | 'insert' | 'patch' | 'comment' | null;
  insertPosition?: 'above' | 'below' | null;
};

/**
 * The passage as it would read once the patch/insert is applied, without diff markup.
 * INSERT: inserted text joined to the anchored passage, above or below it.
 * PATCH/replace: the replacement text.
 */
export default function ActivityUpdatedText({ removed, added, mode, insertPosition }: Props) {
  const removedText = (removed || '').trim();
  const addedText = (added || '').trim();
  if (!removedText && !addedText) return null;

  const isInsert = mode === 'insert';
  const below = insertPosition === 'below';
  const result = isInsert
    ? [below ? removedText : addedText, below ? addedText : removedText].filter(Boolean).join('\n\n')
    : addedText;

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">
        {isInsert
          ? removedText
            ? 'Passage after the insert'
            : 'Inserted text (anchored passage not recorded)'
          : removedText
            ? 'Passage after the patch'
            : 'Replacement text (anchored passage not recorded)'}
      </p>
      {result ? (
        <div className="whitespace-pre-wrap break-words rounded border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm leading-relaxed text-slate-100">
          {result}
        </div>
      ) : null}
    </div>
  );
}
