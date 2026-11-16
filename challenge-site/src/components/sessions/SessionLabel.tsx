/** Provenance labels from the owner spec (§5). Only the labels that apply to this page are used. */
export type SessionLabelKind =
  | 'Participant proposal'
  | 'Claude synthesis'
  | 'Proposal added after the meeting'
  | 'Disputed interpretation'
  | 'Facilitator-confirmed meeting outcome'
  | 'Council decision';

const STYLES: Record<SessionLabelKind, string> = {
  'Participant proposal': 'border-emerald-700/60 bg-emerald-950/50 text-emerald-200',
  'Claude synthesis': 'border-violet-700/60 bg-violet-950/50 text-violet-200',
  'Proposal added after the meeting': 'border-amber-700/60 bg-amber-950/50 text-amber-200',
  'Disputed interpretation': 'border-rose-700/60 bg-rose-950/50 text-rose-200',
  'Facilitator-confirmed meeting outcome': 'border-sky-700/60 bg-sky-950/50 text-sky-200',
  'Council decision': 'border-cyan-700/60 bg-cyan-950/50 text-cyan-200',
};

export default function SessionLabel({ kind }: { kind: SessionLabelKind }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 align-middle text-xs font-medium ${STYLES[kind]}`}>
      {kind}
    </span>
  );
}
