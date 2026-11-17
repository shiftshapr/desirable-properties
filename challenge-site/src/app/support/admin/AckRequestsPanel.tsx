'use client';

import { useEffect, useState } from 'react';

/**
 * Read-only panel in the Support admin: the number of new Acknowledgements requests and a link to
 * Gov Hub, where the steering committee and super admins review them. No review or reply here.
 */
export default function AckRequestsPanel() {
  const [state, setState] = useState<{ count: number | null; reviewUrl: string } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/support/admin/ack-requests', { credentials: 'include', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.ok) setState({ count: typeof d.new === 'number' ? d.new : null, reviewUrl: String(d.reviewUrl || '') });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  if (!state) return null;
  const { count, reviewUrl } = state;
  return (
    <section
      aria-labelledby="ack-panel-h"
      className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-800/50 bg-violet-950/20 px-4 py-3"
    >
      <div className="min-w-0">
        <h2 id="ack-panel-h" className="text-sm font-semibold text-white">Acknowledgements requests</h2>
        <p className="text-sm text-slate-300">
          {count === null
            ? 'The count is not available just now.'
            : count === 0
              ? 'No new requests.'
              : `${count} new ${count === 1 ? 'request' : 'requests'} waiting for review.`}{' '}
          Reviewed on Gov Hub by the steering committee and super admins, not in this queue.
        </p>
      </div>
      {reviewUrl ? (
        <a
          href={reviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-violet-600 px-3 py-1.5 text-sm font-semibold text-violet-100 hover:bg-violet-900/40"
        >
          Open the review list on Gov Hub<span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : null}
    </section>
  );
}
