'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import OptionProvenanceLine from '@/components/sessions/OptionProvenanceLine';
import SessionLabel from '@/components/sessions/SessionLabel';
import { provenanceFor } from '@/lib/sessions/option-provenance';
import { withScreening } from '@/lib/sessions/option-provenance-core';
import { pacificAndUtc } from '@/lib/sessions/session-phases';
import {
  outcomeText,
  type BallotDefinition,
  type BallotResults,
  type BallotStatus,
  type HeldBackQuestion,
} from '@/lib/ballots/ballot-core';

type Props = {
  ballot: BallotDefinition;
  status: BallotStatus;
  signedIn: boolean;
  signInHref: string;
  /** Screened ballot: keys of the questions that reached the ballot (null: every question, no screening). */
  votable?: string[] | null;
  /** Questions held back by the council, with the objections standing at the close. */
  heldBack?: HeldBackQuestion[];
  /** No voting controls (staging preview of a later time, or nothing can be recorded). */
  readOnly?: boolean;
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
export default function SessionBallotPanel({ ballot, status, signedIn, signInHref, votable = null, heldBack = [], readOnly = false }: Props) {
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
    if (status === 'not_open' || readOnly || (status !== 'published' && !signedIn)) return;
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load, status, signedIn, readOnly]);

  const saved = useMemo(() => data?.viewer?.votes || {}, [data]);
  const canVote = status === 'open' && !readOnly && signedIn && Boolean(data?.viewer?.signedIn);
  const held = new Map(heldBack.map((h) => [h.key, h]));
  const isVotable = (key: string) => !held.has(key) && (votable === null || votable.includes(key));
  const votableCount = ballot.questions.filter((q) => isVotable(q.key)).length;
  // After screening: options on the ballot read "On the ballot"; held-back ones "Screened out".
  const screened = Boolean(ballot.screenedBy) && votable !== null;
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
      {status === 'open' && !signedIn && !readOnly ? (
        <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-3">
          <p className="text-base text-slate-300">Sign in to vote. {ballot.voterBody}</p>
          <Link href={signInHref} className={btn}>
            Sign in
          </Link>
        </div>
      ) : null}
      {canVote ? (
        <p className="mb-5 text-sm text-slate-400">
          {answered} of {votableCount} questions answered. The site never
          shows how an account voted; only the totals are published after the close.
        </p>
      ) : null}
      {data && !data.ok && data.error ? <p className="mb-5 text-sm text-rose-300">{data.error}</p> : null}

      <ol className="space-y-4">
        {ballot.questions.map((q) => {
          const result = results?.questions.find((r) => r.key === q.key);
          const hb = held.get(q.key);
          const context = (
            <>
              <p className="text-sm text-slate-400">
                <em>Context: {q.context}</em>
                {q.label ? (
                  <>
                    {' '}
                    <SessionLabel kind={q.label} />
                  </>
                ) : null}
              </p>
              {q.correction ? <p className="mt-1 text-sm text-amber-200">{q.correction}</p> : null}
            </>
          );
          if (hb) {
            return (
              <li key={q.key} className="rounded-xl border border-amber-800/60 bg-amber-950/10 px-4 py-3">
                {context}
                <p className="mt-1 font-semibold text-slate-300">
                  {q.n}. {q.question}
                </p>
                <p className="mt-2 text-sm font-semibold text-amber-300">Held back by the council. Not on this ballot.</p>
                <ul className="mt-2 space-y-2 text-sm">
                  {hb.objections.map((o) => (
                    <li key={`${o.name}-${o.createdAt}`} className="rounded-lg border border-amber-800/50 bg-amber-950/20 px-3 py-2 text-slate-200">
                      <strong className="text-white">{o.name}</strong> objected: {o.reason}
                      <span className="mt-0.5 block text-xs text-slate-400">{pacificAndUtc(o.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          }
          if (!isVotable(q.key)) return null;
          return (
            <li key={q.key} className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
              {context}
              <fieldset className="mt-1" disabled={!canVote || saving}>
                <legend className="font-semibold text-white">
                  {q.n}. {q.question}
                </legend>
                <div className="mt-2 space-y-1.5">
                  {q.options.map((o) => {
                    const count = result?.options.find((x) => x.key === o.key)?.votes;
                    const found = provenanceFor(ballot.slug, q.key, o.key);
                    const prov = found && screened ? withScreening(found, 'goes_to_ballot') : found;
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
