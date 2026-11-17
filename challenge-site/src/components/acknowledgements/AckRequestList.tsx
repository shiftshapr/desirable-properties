'use client';

import { ackRequestSummary, ackStatusInfo, type AckRequestView } from '@/lib/ack-request';

const STATUS_STYLE: Record<string, string> = {
  new: 'border-sky-600/60 bg-sky-950/50 text-sky-200',
  accepted: 'border-emerald-600/60 bg-emerald-950/50 text-emerald-200',
  declined: 'border-slate-500/60 bg-slate-800/60 text-slate-200',
  done: 'border-violet-600/60 bg-violet-950/50 text-violet-200',
};

function fmtDate(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function imageUrl(r: AckRequestView, attId: string, thumb: boolean) {
  const base = `/api/acknowledgements/requests/${encodeURIComponent(r.id)}/attachments/${encodeURIComponent(attId)}`;
  return thumb ? `${base}?size=thumb` : base;
}

/**
 * The viewer's own Acknowledgements requests, each labelled as such, with the steering committee's
 * review status (New / Accepted / Declined / Done) and the images they attached.
 */
export default function AckRequestList({ requests, headingLevel = 3 }: { requests: AckRequestView[]; headingLevel?: 2 | 3 | 4 }) {
  if (!requests.length) return null;
  const H = headingLevel === 2 ? 'h2' : headingLevel === 4 ? 'h4' : 'h3';
  return (
    <ul className="space-y-3">
      {requests.map((r) => {
        const status = ackStatusInfo(r.status, r.status_label);
        const details: [string, string | null][] = [
          ['Name as it should appear', r.requested_name],
          ['Name as it appears now', r.current_name],
          ['Affiliation', r.affiliation],
          ['Move to', r.target_list_label],
          ['Call for Input', r.call_for_input_label],
          ['Role', r.role],
          ['What you contributed', r.contribution],
          ['Link', r.contribution_url],
          ['Your note', r.note],
        ];
        const shown = details.filter(([, v]) => v);
        return (
          <li key={r.id} className="min-w-0 rounded-lg border border-violet-800/50 bg-slate-900/60 px-4 py-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded border border-violet-600/60 bg-violet-950/50 px-2 py-0.5 text-xs font-semibold text-violet-200">
                Acknowledgements request
              </span>
              <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.status] || STATUS_STYLE.declined}`}>
                Status: {status.label}
              </span>
            </div>
            <H className="mt-2 break-words font-medium text-white">{ackRequestSummary(r)}</H>
            <p className="mt-1 text-slate-400">
              <span className="font-mono text-slate-300">{r.reference}</span>
              {' · '}
              {r.kind_label}
              {r.created_at ? <> · sent {fmtDate(r.created_at)}</> : null}
              {r.status_changed_at ? <> · status updated {fmtDate(r.status_changed_at)}</> : null}
            </p>
            {status.meaning ? <p className="mt-1 text-slate-300">{status.meaning}</p> : null}
            {shown.length ? (
              <details className="mt-2">
                <summary className="cursor-pointer text-cyan-300 hover:text-cyan-200">What you sent</summary>
                <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-[auto_1fr]">
                  {shown.map(([label, value]) => (
                    <div key={label} className="contents">
                      <dt className="text-slate-400">{label}</dt>
                      <dd className="min-w-0 whitespace-pre-wrap break-words text-slate-200">{value}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            ) : null}
            {r.attachments.length ? (
              <div className="mt-3">
                <p className="text-slate-400">Your images (open full size in a new tab)</p>
                <ul className="mt-1 flex flex-wrap gap-2">
                  {r.attachments.map((a, i) => {
                    const label = `Image ${i + 1} of ${r.attachments.length} for ${r.reference}`;
                    return (
                      <li key={a.id}>
                        <a
                          href={imageUrl(r, a.id, false)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-md border border-slate-700 hover:border-cyan-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                          aria-label={`Open ${label} full size (opens in a new tab)`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- private, uncached image from our own route */}
                          <img
                            src={imageUrl(r, a.id, a.has_thumb)}
                            alt={label}
                            loading="lazy"
                            className="h-24 w-24 rounded-md object-cover"
                          />
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
