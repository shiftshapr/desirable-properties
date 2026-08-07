type Props = {
  removed?: string | null;
  added?: string | null;
  mode?: 'replace' | 'insert' | 'patch' | 'comment' | null;
};

function DiffLine({
  variant,
  text,
}: {
  variant: 'removed' | 'added';
  text: string;
}) {
  const isRemoved = variant === 'removed';
  return (
    <pre
      className={`whitespace-pre-wrap break-words rounded border px-3 py-2 font-mono text-xs leading-relaxed ${
        isRemoved
          ? 'border-rose-900/50 bg-rose-950/40 text-rose-100'
          : 'border-emerald-900/50 bg-emerald-950/35 text-emerald-100'
      }`}
    >
      <span className={`mr-2 select-none ${isRemoved ? 'text-rose-400' : 'text-emerald-400'}`}>
        {isRemoved ? '−' : '+'}
      </span>
      {text}
    </pre>
  );
}

/** Red/green diff-style preview for patch/insert proposals. */
export default function ActivityDiffBlock({ removed, added, mode }: Props) {
  const removedText = (removed || '').trim();
  const addedText = (added || '').trim();
  if (!removedText && !addedText) return null;

  const showRemoved = Boolean(removedText) && mode !== 'insert';

  return (
    <div className="mt-2 space-y-1.5">
      {mode === 'insert' ? (
        <p className="text-[11px] uppercase tracking-wide text-slate-500">Insert above selection</p>
      ) : null}
      {showRemoved ? <DiffLine variant="removed" text={removedText} /> : null}
      {addedText ? <DiffLine variant="added" text={addedText} /> : null}
    </div>
  );
}
