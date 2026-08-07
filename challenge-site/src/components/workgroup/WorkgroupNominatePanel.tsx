'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { fetchWorkgroupPositions, nominateWorkgroupPosition } from '@/lib/workgroup-collab-api';

type Position = { key: string; label: string; description?: string };

type Props = {
  workgroupId: string;
  fallbackHref?: string;
  className?: string;
};

const DEFAULT_POSITIONS: Position[] = [
  { key: 'chair', label: 'Coordinator' },
  { key: 'co_lead', label: 'Co-lead' },
  { key: 'editor', label: 'Editor' },
  { key: 'presenter', label: 'Presenter' },
  { key: 'facilitator', label: 'Facilitator' },
  { key: 'liaison', label: 'Liaison' },
  { key: 'recorder', label: 'Recorder' },
];

export default function WorkgroupNominatePanel({
  workgroupId,
  fallbackHref,
  className = '',
}: Props) {
  const { user, checked } = useAuth();
  const [open, setOpen] = useState(false);
  const [positions, setPositions] = useState<Position[]>(DEFAULT_POSITIONS);
  const [position, setPosition] = useState('chair');
  const [nomineeName, setNomineeName] = useState('');
  const [nomineeEmail, setNomineeEmail] = useState('');
  const [nomineeProfileUrl, setNomineeProfileUrl] = useState('');
  const [statement, setStatement] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchWorkgroupPositions();
        if (!cancelled && data.positions?.length) {
          setPositions(
            data.positions.map((p) => ({
              key: p.key || p.position_key || '',
              label: p.label || p.position_label || p.key || '',
              description: p.description,
            })).filter((p) => p.key),
          );
        }
      } catch {
        /* keep defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (user && open && !nomineeName) {
      setNomineeName(user.displayName || user.username || '');
    }
  }, [user, open, nomineeName]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!user) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    setBusy(true);
    try {
      const res = await nominateWorkgroupPosition(workgroupId, {
        position_key: position,
        nominee_name: nomineeName.trim(),
        nominee_email: nomineeEmail.trim(),
        nominee_profile_url: nomineeProfileUrl.trim(),
        statement: statement.trim(),
      });
      setSuccess(res.message || 'Nomination submitted');
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nomination failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      {!open ? (
        <button
          type="button"
          disabled={!checked}
          onClick={() => {
            if (!user) {
              window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
              return;
            }
            setOpen(true);
          }}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500 disabled:opacity-50"
        >
          {user ? 'Nominate' : 'Sign in to nominate'}
        </button>
      ) : (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="mt-2 space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white">Nominate for a position</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
          </div>
          <label className="block text-xs text-slate-400">
            Position
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            >
              {positions.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-slate-400">
            Nominee name
            <input
              required
              value={nomineeName}
              onChange={(e) => setNomineeName(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Nominee email
            <input
              required
              type="email"
              value={nomineeEmail}
              onChange={(e) => setNomineeEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-slate-400">
            CV / LinkedIn URL
            <input
              required
              type="url"
              value={nomineeProfileUrl}
              onChange={(e) => setNomineeProfileUrl(e.target.value)}
              placeholder="https://"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Statement
            <textarea
              required
              rows={3}
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
          >
            {busy ? 'Submitting…' : 'Submit nomination'}
          </button>
        </form>
      )}
      {error ? (
        <p className="mt-2 text-sm text-rose-300">
          {error}
          {fallbackHref ? (
            <>
              {' '}
              <a href={fallbackHref} className="underline hover:text-rose-200">
                Open on Gov Hub
              </a>
            </>
          ) : null}
        </p>
      ) : null}
      {success ? <p className="mt-2 text-sm text-emerald-300">{success}</p> : null}
    </div>
  );
}
