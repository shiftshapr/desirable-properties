'use client';

import { useEffect, useState } from 'react';
import { PARTICIPANT_FIELDS, changedParticipantFields, type ParticipantEditStatus } from '@/lib/participant-edits';
import type { ParticipantEditRow } from '@/lib/participant-edits-store.server';

const KIND_LABEL = { edit: 'Proposed edit', approve: 'Looks good as is', remove: 'Asked to be removed' } as const;
const FIELD_LABEL = { name: 'Name', role: 'Role', headline: 'Headline', description: 'Description' } as const;
const FILTERS: [string, string][] = [['new', 'To review'], ['applied', 'Applied'], ['dismissed', 'Dismissed'], ['', 'All']];

/** Proposed edits sent from the Meta-Layer Initiative participants page, current listing beside the proposal. */
export default function ParticipantEditsPanel() {
  const [filter, setFilter] = useState('new');
  const [edits, setEdits] = useState<ParticipantEditRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/participant-edits${filter ? `?status=${filter}` : ''}`, { cache: 'no-store' })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.message || body.error || `Error ${res.status}`);
        if (!cancelled) {
          setEdits(body.edits);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      });
    return () => {
      cancelled = true;
    };
  }, [filter, reload]);

  async function mark(id: string, status: ParticipantEditStatus) {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/participant-edits/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || body.error || `Error ${res.status}`);
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-white">Participant edits</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          What people sent from their review copy of the Meta-Layer Initiative participants page. Nothing here changes
          the page by itself: update the page, then mark the item applied.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {FILTERS.map(([value, label]) => (
          <button
            key={value || 'all'}
            type="button"
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={`rounded-full border px-3 py-1 ${
              filter === value ? 'border-cyan-400 bg-cyan-400/10 text-cyan-200' : 'border-slate-700 text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {edits && !edits.length ? <p className="text-sm text-slate-400">Nothing here yet.</p> : null}

      <ul className="space-y-3">
        {edits?.map((e) => {
          const changed = e.kind === 'edit' ? changedParticipantFields(e.current, e.proposed) : [];
          return (
            <li key={e.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-base font-semibold text-white">
                  {e.current.name}{' '}
                  <span
                    className={`ml-1 rounded px-2 py-0.5 text-xs font-medium ${
                      e.kind === 'approve'
                        ? 'bg-emerald-400/15 text-emerald-200'
                        : e.kind === 'remove'
                          ? 'bg-rose-400/15 text-rose-200'
                          : 'bg-amber-400/15 text-amber-200'
                    }`}
                  >
                    {KIND_LABEL[e.kind]}
                  </span>
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(e.createdAt).toLocaleString()} · {e.slug} · {e.status}
                  {e.reviewedBy ? ` by ${e.reviewedBy}` : ''}
                </p>
              </div>

              {PARTICIPANT_FIELDS.filter((f) => changed.includes(f)).map((f) => (
                <div key={f} className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">{FIELD_LABEL[f]} now</p>
                    <p className="mt-1 whitespace-pre-wrap text-slate-400">{e.current[f] || '(empty)'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-cyan-300">{FIELD_LABEL[f]} proposed</p>
                    <p className="mt-1 whitespace-pre-wrap text-slate-100">{e.proposed[f] || '(empty)'}</p>
                  </div>
                </div>
              ))}

              {e.photoNote ? (
                <p className="mt-3 whitespace-pre-wrap text-slate-200">
                  <span className="text-xs uppercase tracking-wide text-slate-500">Photo </span>
                  {e.photoNote}
                </p>
              ) : null}
              {e.note ? (
                <p className="mt-3 whitespace-pre-wrap text-slate-200">
                  <span className="text-xs uppercase tracking-wide text-slate-500">Note </span>
                  {e.note}
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                {e.status !== 'applied' ? (
                  <button type="button" disabled={busy === e.id} onClick={() => mark(e.id, 'applied')}
                    className="rounded bg-cyan-500 px-3 py-1 font-medium text-slate-950 disabled:opacity-50">
                    Mark applied
                  </button>
                ) : null}
                {e.status !== 'dismissed' ? (
                  <button type="button" disabled={busy === e.id} onClick={() => mark(e.id, 'dismissed')}
                    className="rounded border border-slate-700 px-3 py-1 text-slate-200 disabled:opacity-50">
                    Dismiss
                  </button>
                ) : null}
                {e.status !== 'new' ? (
                  <button type="button" disabled={busy === e.id} onClick={() => mark(e.id, 'new')}
                    className="rounded border border-slate-700 px-3 py-1 text-slate-200 disabled:opacity-50">
                    Back to review
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
