'use client';

/** The headings the anchored passage sits under, so reviewers know where it is without opening the book. */
export default function SectionLabel({ section, className = 'mt-3' }: { section: string | null; className?: string }) {
  if (!section) return null;
  const parts = section.split(' › ');
  const last = parts.pop();
  return (
    <p className={`text-xs text-slate-400 ${className}`}>
      <span className="text-slate-500">Section </span>
      {parts.map((p) => (
        <span key={p} className="text-slate-500">
          {p} ›{' '}
        </span>
      ))}
      <span className="font-medium text-slate-200">{last}</span>
    </p>
  );
}
