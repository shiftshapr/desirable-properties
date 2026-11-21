import { SOURCE_LABEL, STATUS_TONE, shortDate, statusLabel, type IndexedProposal } from '@/components/improve/improve-shared';
import { VERSION_MARKER_LABEL, versionMarkerOf } from '@/lib/dp-v11';

type Props = { p: IndexedProposal; showDoc?: boolean };

/** One proposal as a compact row; the whole row links to the document's steering page. */
export default function ProposalRow({ p, showDoc = true }: Props) {
  const marker = versionMarkerOf({ status: p.status, review_note: p.reviewNote });
  return (
    <li>
      <a
        href={`/steering/${encodeURIComponent(p.mlNumber)}`}
        className="group block min-w-0 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2.5 hover:border-cyan-700 focus-visible:border-cyan-500"
      >
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className={`rounded border px-1.5 py-0.5 ${STATUS_TONE[p.status] || 'border-slate-700 text-slate-300'}`}>{statusLabel(p)}</span>
          {marker ? (
            <span className="rounded border border-sky-700/70 px-1.5 py-0.5 text-sky-200">{VERSION_MARKER_LABEL[marker]}</span>
          ) : null}
          {showDoc ? <span className="font-semibold text-white">{p.docKey}</span> : null}
          {p.section ? <span className="min-w-0 truncate text-slate-400">{p.section}</span> : null}
          <span className="ml-auto shrink-0 text-slate-500">{shortDate(p.createdAt)}</span>
        </span>
        {p.summaryLine ? (
          <span className="mt-1 block truncate text-sm text-slate-200 group-hover:text-white">{p.summaryLine}</span>
        ) : null}
        <span className="mt-0.5 block truncate text-xs text-slate-500">
          {p.author} · {SOURCE_LABEL[p.source] || p.source}
          {p.coEditor && p.status !== 'pending' ? ` · decided by ${p.coEditor}` : ''}
          {p.revised ? ' · accepted with revisions' : ''}
        </span>
      </a>
    </li>
  );
}
