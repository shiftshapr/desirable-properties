import type { ReactNode } from 'react';
import {
  evidenceHref,
  evidenceLabel,
  outcomeText,
  type OptionProvenance,
  type ProvenanceEvidence,
} from '@/lib/sessions/option-provenance-core';

const STATUS_CLASS: Partial<Record<OptionProvenance['status'], string>> = {
  approved: 'text-emerald-300',
  not_approved: 'text-slate-400',
  tie: 'text-amber-200',
  screened_out: 'text-rose-300',
  decided_in_meeting: 'text-sky-200',
};

function When({ e }: { e: ProvenanceEvidence | null }) {
  if (!e) return null;
  const href = evidenceHref(e);
  const label = evidenceLabel(e);
  return (
    <>
      {' '}
      (
      {href ? (
        <a href={href} className="underline decoration-slate-600 underline-offset-2 hover:text-cyan-200">
          {label}
        </a>
      ) : (
        label
      )}
      )
    </>
  );
}

/**
 * One line of small text under a ballot option: "Proposed by X · Seconded by Y · Approved · 11 of 24 votes".
 * Plain markup (no hooks), so both the server-rendered draft ballot and the client ballot panel can use it.
 */
export default function OptionProvenanceLine({
  rec,
  showOutcome = true,
  className = '',
}: {
  rec: OptionProvenance;
  showOutcome?: boolean;
  className?: string;
}) {
  const seconds = rec.seconders.filter((s) => s.kind === 'second');
  const supports = rec.seconders.filter((s) => s.kind === 'support');
  const parts: ReactNode[] = [];
  if (rec.origin === 'standard') parts.push(<span key="p">Standard option</span>);
  else if (rec.proposer)
    parts.push(
      <span key="p">
        Proposed by {rec.proposer}
        <When e={rec.proposerEvidence} />
        {rec.presentedBy ? (
          <>
            , put forward by {rec.presentedBy.name}
            <When e={rec.presentedBy.evidence} />
          </>
        ) : null}
        {(rec.contributors ?? []).map((c) => (
          <span key={c.name}>
            ; {c.what} from {c.name}
            <When e={c.evidence} />
          </span>
        ))}
      </span>,
    );
  else parts.push(<span key="p" title={rec.notes}>Proposer not recorded</span>);
  if (seconds.length)
    parts.push(
      <span key="s">
        Seconded by{' '}
        {seconds.map((s, i) => (
          <span key={s.name}>
            {i ? ', ' : ''}
            {s.name}
            <When e={s.evidence} />
          </span>
        ))}
      </span>,
    );
  if (supports.length)
    parts.push(
      <span key="u">
        Supported by{' '}
        {supports.map((s, i) => (
          <span key={s.name}>
            {i ? ', ' : ''}
            {s.name}
            <When e={s.evidence} />
          </span>
        ))}
      </span>,
    );
  if (showOutcome) parts.push(<span key="o" className={STATUS_CLASS[rec.status] ?? 'text-slate-300'}>{outcomeText(rec)}</span>);
  return (
    // A span, not a p: it sits inside the ballot's <label> elements.
    <span className={`block text-xs leading-relaxed text-slate-400 ${className}`} data-provenance={rec.id}>
      {parts.map((p, i) => (
        <span key={i}>
          {i ? ' · ' : ''}
          {p}
        </span>
      ))}
    </span>
  );
}
