type Props = {
  className?: string;
};

/** Small badge for experimental Hermes workgroup features. */
export default function HermesExperimentalBadge({ className = '' }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded border border-amber-600/50 bg-amber-950/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200 ${className}`}
      title="Experimental feature — behavior may change"
    >
      Experimental
    </span>
  );
}
