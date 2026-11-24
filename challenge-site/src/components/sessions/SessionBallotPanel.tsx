'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import OptionProvenanceLine from '@/components/sessions/OptionProvenanceLine';
import SessionLabel from '@/components/sessions/SessionLabel';
import { provenanceFor } from '@/lib/sessions/option-provenance';
import {
  outcomeText,
  type BallotDefinition,
  type BallotResults,
  type BallotStatus,
} from '@/lib/ballots/ballot-core';

type Props = {
  ballot: BallotDefinition;
  status: BallotStatus;
  signedIn: boolean;
  signInHref: string;
};

type ApiState = {
  ok: boolean;
  ballot?: { status: BallotStatus; closesAt: string | null };
  viewer?: { signedIn: boolean; votes: Record<string, string> };
  results?: BallotResults | null;
  error?: string;
};

const btn =
  'inline-flex items-center rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50';

/** The questions with their options; voting controls for a signed-in account while open; totals once published. */
export default function SessionBallotPanel({ ballot, status, signedIn, signInHref }: Props) {
  const api = `/api/ballots/${encodeURIComponent(ballot.slug)}`;
  const [data, setData] = useState<ApiState | null>(null);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(api, { cache: 'no-store', credentials: 'same-origin' });
      const json = (await res.json()) as ApiState;
      setData(json);
      if (json.viewer?.votes) setChoices(json.viewer.votes);
    } catch {
      setData({ ok: false, error: 'Could not load the ballot. Reload the page to try again.' });
    }
  }, [api]);

  useEffect(() => {
    if (status === 'not_open' || (status !== 'published' && !signedIn)) return;
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load, status, signedIn]);

  const saved = useMemo(() => data?.viewer?.votes || {}, [data]);
  const canVote = status === 'open' && signedIn && Boolean(data?.viewer?.signedIn);
  const dirty = useMemo(
    () => Object.entries(choices).some(([k, v]) => saved[k] !== v),
    [choices, saved],
  );
  const answered = Object.keys(saved).length;
  const results = data?.results || null;

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const votes = Object.fromEntries(Object.entries(choices).filter(([k, v]) => saved[k] !== v));
      const res = await fetch(api, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ votes }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; votes?: Record<string, string> };
      if (!res.ok || !json.ok) {
        setMessage({ kind: 'error', text: json.error || 'Your votes were not saved.' });
      } else {
        setData((d) => (d ? { ...d, viewer: { signedIn: true, votes: json.votes || {} } } : d));
        setChoices(json.votes || {});
        setMessage({ kind: 'ok', text: 'Your votes are saved. You can change them until the ballot closes.' });
      }
    } catch {
      setMessage({ kind: 'error', text: 'Your votes were not saved. Check your connection and try again.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6">
      {status === 'open' && !signedIn ? (
        <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-3">
          <p className="text-base text-slate-300">Sign in to vote. {ballot.voterBody}</p>
          <Link href={signInHref} className={btn}>
            Sign in
          </Link>
        </div>
      ) : null}
      {canVote ? (
        <p className="mb-5 text-sm text-slate-400">
          {answered} of {ballot.questions.length} questions answered. The site never
          shows how an account voted; only the totals are published after the close.
        </p>
      ) : null}
      {data && !data.ok && data.error ? <p className="mb-5 text-sm text-rose-300">{data.error}</p> : null}

      <ol className="space-y-4">
        {ballot.questions.map((q) => {
          const result = results?.questions.find((r) => r.key === q.key);
          return (
            <li key={q.key} className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
              <p className="text-sm text-slate-400">
                <em>Context: {q.context}</em>
                {q.label ? (
                  <>
                    {' '}
                    <SessionLabel kind={q.label} />
                  </>
                ) : null}
              </p>
              <fieldset className="mt-1" disabled={!canVote || saving}>
                <legend className="font-semibold text-white">
                  {q.n}. {q.question}
                </legend>
                <div className="mt-2 space-y-1.5">
                  {q.options.map((o) => {
                    const count = result?.options.find((x) => x.key === o.key)?.votes;
                    const prov = provenanceFor(ballot.slug, q.key, o.key);
                    return (
                      <label
                        key={o.key}
                        className={`flex items-start gap-2 rounded-md px-2 py-1 text-sm text-slate-200 ${canVote ? 'cursor-pointer hover:bg-slate-800/60' : ''}`}
                      >
                        <input
                          type="radio"
                          name={`${ballot.slug}-${q.key}`}
                          value={o.key}
                          checked={choices[q.key] === o.key}
                          onChange={() => setChoices((c) => ({ ...c, [q.key]: o.key }))}
                          className="mt-0.5 accent-cyan-400"
                        />
                        <span>
                          {o.label}
                          {count !== undefined ? <span className="ml-2 text-slate-400">({count})</span> : null}
                          {prov ? <OptionProvenanceLine rec={prov} className="mt-0.5" /> : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              {result ? <p className="mt-2 text-sm font-semibold text-cyan-200">{outcomeText(result)}</p> : null}
            </li>
          );
        })}
      </ol>

      {results ? (
        <p className="mt-4 text-sm text-slate-400">
          {results.voters} accounts voted.
        </p>
      ) : null}

      {canVote ? (
        <div className="sticky bottom-4 mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-slate-700 bg-slate-950/95 px-4 py-3">
          <button type="button" className={btn} disabled={saving || !dirty} onClick={() => void save()}>
            {saving ? 'Saving…' : 'Save my votes'}
          </button>
          {message ? (
            <p role="status" className={`text-sm ${message.kind === 'ok' ? 'text-emerald-300' : 'text-rose-300'}`}>
              {message.text}
            </p>
          ) : dirty ? (
            <p className="text-sm text-amber-200">You have unsaved choices.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
