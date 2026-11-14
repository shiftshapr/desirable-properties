'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import LocalTime from '@/components/council/LocalTime';
import {
  friendlyCouncilError,
  isSignInError,
  type CouncilCandidate,
  type CouncilPhase,
  type ElectionMe,
} from '@/lib/council';

type Props = {
  electionId: string;
  phase: CouncilPhase;
  candidates: CouncilCandidate[];
  votingCloseAt: string | null;
  nominationsOpenAt: string | null;
  nominationsCloseAt: string | null;
  votingOpenAt: string | null;
  eligibilitySummary: string | null;
  signedIn: boolean;
};

type ApiResult = { ok: boolean; status: number; data: Record<string, unknown> };

const STATEMENT_MAX = 3000;
const NOTE_MAX = 1000;

const card = 'rounded-xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6';
const primaryBtn =
  'inline-flex items-center justify-center rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryBtn =
  'inline-flex items-center justify-center rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50';
const dangerBtn =
  'inline-flex items-center justify-center rounded-lg border border-rose-800 px-4 py-2.5 text-sm font-medium text-rose-200 hover:border-rose-600 disabled:cursor-not-allowed disabled:opacity-50';
const field =
  'mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-600 focus:outline-none';

function loginHref() {
  if (typeof window === 'undefined') return '/login';
  const url = new URL(window.location.href);
  return `/login?next=${encodeURIComponent(url.pathname + url.search + url.hash)}`;
}

async function call(path: string, init?: RequestInit): Promise<ApiResult> {
  try {
    const res = await fetch(path, {
      credentials: 'include',
      cache: 'no-store',
      ...init,
      headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}) },
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { code: 'UPSTREAM_UNAVAILABLE' } };
  }
}

function errorText(r: ApiResult) {
  return String(r.data.message || friendlyCouncilError(r.data.code, r.data.error));
}

function SignInPrompt({ text }: { text: string }) {
  return (
    <div className={card}>
      <p className="text-slate-200">{text}</p>
      <a href={loginHref()} className={`${primaryBtn} mt-4`}>
        Sign in
      </a>
    </div>
  );
}

function Notice({ tone = 'info', children }: { tone?: 'info' | 'ok' | 'error'; children: React.ReactNode }) {
  const styles =
    tone === 'ok'
      ? 'border-emerald-800/70 bg-emerald-950/30 text-emerald-100'
      : tone === 'error'
        ? 'border-rose-900/70 bg-rose-950/30 text-rose-100'
        : 'border-slate-700 bg-slate-900/60 text-slate-200';
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-4 py-3 text-sm ${styles}`}>
      {children}
    </div>
  );
}

export default function ElectionActions(props: Props) {
  const { electionId, phase, candidates, signedIn } = props;
  const router = useRouter();
  const base = `/api/council/elections/${encodeURIComponent(electionId)}`;
  const [me, setMe] = useState<ElectionMe | null>(null);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'ready' | 'signin' | 'error'>(
    signedIn ? 'loading' : 'idle',
  );
  const [loadError, setLoadError] = useState('');

  const applyMe = useCallback((r: ApiResult) => {
    if (r.ok) {
      setMe(r.data as unknown as ElectionMe);
      setLoadState('ready');
    } else if (isSignInError(r.status, r.data.code)) {
      setLoadState('signin');
    } else {
      setLoadError(errorText(r));
      setLoadState('error');
    }
  }, []);

  const loadMe = useCallback(async () => {
    applyMe(await call(`${base}/me`));
  }, [base, applyMe]);

  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    call(`${base}/me`).then((r) => {
      if (live) applyMe(r);
    });
    return () => {
      live = false;
    };
  }, [signedIn, base, applyMe]);

  const afterChange = useCallback(async () => {
    await loadMe();
    router.refresh();
  }, [loadMe, router]);

  const closedPhase = phase === 'counted' || phase === 'published' || phase === 'cancelled';

  if (!signedIn) {
    if (phase === 'nominations') {
      return <SignInPrompt text="Sign in to stand for the council, nominate someone, or answer a nomination." />;
    }
    if (phase === 'voting') return <SignInPrompt text="Sign in to vote. Your ballot is secret." />;
    if (phase === 'announced') {
      return (
        <SignInPrompt text="Nominations have not opened yet. Sign in now so you are ready to stand, nominate or vote." />
      );
    }
    if (phase === 'review') return <SignInPrompt text="Sign in to answer a nomination or to be ready to vote." />;
    return null;
  }

  if (loadState === 'loading') {
    return <div className={`${card} text-sm text-slate-400`}>Checking what you can do in this election…</div>;
  }
  if (loadState === 'signin') {
    return <SignInPrompt text="Your sign-in has expired. Sign in again to take part." />;
  }
  if (loadState === 'error' || !me) {
    return (
      <div className={card}>
        <Notice tone="error">{loadError || 'Could not load your election status.'}</Notice>
        <button type="button" className={`${secondaryBtn} mt-3`} onClick={() => void loadMe()}>
          Try again
        </button>
      </div>
    );
  }

  const mine = me.my_candidacy;
  const sections: React.ReactNode[] = [];

  if (mine?.status === 'pending_consent' && (phase === 'nominations' || phase === 'review')) {
    sections.push(<RespondPanel key="respond" base={base} candidateId={mine.id} onDone={afterChange} />);
  } else if (mine?.status === 'standing') {
    sections.push(
      <StandingPanel
        key="standing"
        base={base}
        candidateId={mine.id}
        statement={mine.statement_md}
        canWithdraw={!closedPhase}
        onDone={afterChange}
      />,
    );
  } else if (mine && ['withdrawn', 'declined', 'rejected'].includes(mine.status)) {
    sections.push(
      <Notice key="mine">
        {mine.status === 'withdrawn'
          ? 'You withdrew your candidacy in this election.'
          : mine.status === 'declined'
            ? 'You declined your nomination in this election.'
            : `Your candidacy was not accepted by the election admins.${mine.rejected_reason ? ` Reason: ${mine.rejected_reason}` : ''}`}
      </Notice>,
    );
  }

  if (phase === 'announced') {
    sections.push(
      <Notice key="announced">
        Nominations open{' '}
        {props.nominationsOpenAt ? <LocalTime iso={props.nominationsOpenAt} showPacific={false} /> : 'soon'}. You
        will be able to stand yourself or nominate someone then.
        {me.eligible ? ' You are eligible to vote in this election.' : ''}
      </Notice>,
    );
  }

  if (phase === 'nominations') {
    if (me.can_apply) sections.push(<ApplyPanel key="apply" base={base} onDone={afterChange} />);
    if (me.can_nominate) sections.push(<NominatePanel key="nominate" base={base} />);
    if (!me.eligible && !me.can_apply) {
      sections.push(
        <Notice key="not-eligible">
          You are not eligible to stand, nominate or vote in this election.
          {props.eligibilitySummary ? ` ${props.eligibilitySummary}` : ''}
        </Notice>,
      );
    }
  }

  if (phase === 'review') {
    sections.push(
      <Notice key="review">
        Nominations have closed. Voting opens{' '}
        {props.votingOpenAt ? <LocalTime iso={props.votingOpenAt} showPacific={false} /> : 'soon'}.
        {me.eligible ? ' You are eligible to vote.' : ''}
      </Notice>,
    );
  }

  if (phase === 'voting') {
    if (me.can_vote) {
      sections.push(
        <BallotPanel
          key={`ballot-${me.my_choices ? me.my_choices.join(',') : 'none'}-${me.my_ballot_cast_at ?? ''}`}
          base={base}
          candidates={candidates}
          myChoices={me.my_choices}
          castAt={me.my_ballot_cast_at ?? null}
          votingCloseAt={props.votingCloseAt}
          onDone={afterChange}
        />,
      );
    } else {
      sections.push(
        <Notice key="cannot-vote">
          You are not on the voter roll for this election.
          {props.eligibilitySummary ? ` ${props.eligibilitySummary}` : ''}
        </Notice>,
      );
    }
  }

  if ((phase === 'counted' || phase === 'published') && me.has_voted) {
    sections.push(<Notice key="voted">You voted in this election. Thank you.</Notice>);
  }

  if (!sections.length) return null;
  return (
    <section aria-labelledby="your-part" className="space-y-4">
      <h2 id="your-part" className="text-xl font-semibold text-white">
        Your part
      </h2>
      {sections}
    </section>
  );
}

function ApplyPanel({ base, onDone }: { base: string; onDone: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [statement, setStatement] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const r = await call(`${base}/apply`, { method: 'POST', body: JSON.stringify({ statement_md: statement }) });
    setBusy(false);
    if (r.ok) await onDone();
    else setError(errorText(r));
  };

  return (
    <div className={card}>
      <h3 className="text-lg font-semibold text-white">Stand for the council</h3>
      <p className="mt-1 text-sm text-slate-400">
        Write a short statement: who you are, what you would bring, and how much time you can give. It is shown with
        your name to everyone.
      </p>
      {!open ? (
        <button type="button" className={`${primaryBtn} mt-4`} onClick={() => setOpen(true)}>
          Stand for the council
        </button>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <label className="block text-sm text-slate-300">
            Your statement
            <textarea
              className={`${field} min-h-[10rem]`}
              value={statement}
              maxLength={STATEMENT_MAX}
              onChange={(e) => setStatement(e.target.value)}
              required
            />
          </label>
          <p className="text-xs text-slate-500">
            {statement.length.toLocaleString()} / {STATEMENT_MAX.toLocaleString()} characters. Markdown is fine.
          </p>
          {error ? <Notice tone="error">{error}</Notice> : null}
          <div className="flex flex-wrap gap-3">
            <button type="submit" className={primaryBtn} disabled={busy || !statement.trim()}>
              {busy ? 'Sending…' : 'Submit my candidacy'}
            </button>
            <button type="button" className={secondaryBtn} onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function NominatePanel({ base }: { base: string }) {
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const r = await call(`${base}/nominate`, { method: 'POST', body: JSON.stringify({ email, note }) });
    setBusy(false);
    if (r.ok) {
      setSentTo(email.trim());
      setEmail('');
      setNote('');
    } else setError(errorText(r));
  };

  return (
    <div className={card}>
      <h3 className="text-lg font-semibold text-white">Nominate someone</h3>
      <p className="mt-1 text-sm text-slate-400">
        Know someone who would serve the book and the properties well? Nominate them by the email address they use to
        sign in. They will only appear as a candidate if they accept.
      </p>
      {sentTo ? (
        <div className="mt-4">
          <Notice tone="ok">
            Thank you. If {sentTo} has an account, we&apos;ll ask them to accept the nomination.
          </Notice>
        </div>
      ) : null}
      <form onSubmit={submit} className="mt-4 space-y-3">
        <label className="block text-sm text-slate-300">
          Their email
          <input
            type="email"
            className={field}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
            required
          />
        </label>
        <label className="block text-sm text-slate-300">
          Why you are nominating them (optional, shared with them)
          <textarea
            className={`${field} min-h-[5rem]`}
            value={note}
            maxLength={NOTE_MAX}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <button type="submit" className={primaryBtn} disabled={busy || !email.trim()}>
          {busy ? 'Sending…' : 'Nominate'}
        </button>
      </form>
    </div>
  );
}

function RespondPanel({ base, candidateId, onDone }: { base: string; candidateId: string; onDone: () => Promise<void> }) {
  const [statement, setStatement] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmDecline, setConfirmDecline] = useState(false);

  const respond = async (accept: boolean) => {
    setBusy(true);
    setError('');
    const r = await call(`${base}/candidates/${encodeURIComponent(candidateId)}/respond`, {
      method: 'POST',
      body: JSON.stringify(accept ? { accept, statement_md: statement } : { accept }),
    });
    setBusy(false);
    if (r.ok) await onDone();
    else setError(errorText(r));
  };

  return (
    <div className="rounded-xl border border-violet-800/70 bg-violet-950/20 p-5 sm:p-6">
      <h3 className="text-lg font-semibold text-white">You have been nominated</h3>
      <p className="mt-1 text-sm text-slate-300">
        Someone nominated you for the council. To stand, accept and write a short statement. It is shown with your name
        to everyone. If you decline, you will not appear in this election.
      </p>
      <label className="mt-4 block text-sm text-slate-300">
        Your statement
        <textarea
          className={`${field} min-h-[8rem]`}
          value={statement}
          maxLength={STATEMENT_MAX}
          onChange={(e) => setStatement(e.target.value)}
        />
      </label>
      {error ? (
        <div className="mt-3">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className={primaryBtn} disabled={busy || !statement.trim()} onClick={() => void respond(true)}>
          Accept and stand
        </button>
        {confirmDecline ? (
          <>
            <button type="button" className={dangerBtn} disabled={busy} onClick={() => void respond(false)}>
              Yes, decline
            </button>
            <button type="button" className={secondaryBtn} disabled={busy} onClick={() => setConfirmDecline(false)}>
              Keep it open
            </button>
          </>
        ) : (
          <button type="button" className={secondaryBtn} disabled={busy} onClick={() => setConfirmDecline(true)}>
            Decline
          </button>
        )}
      </div>
    </div>
  );
}

function StandingPanel({
  base,
  candidateId,
  statement,
  canWithdraw,
  onDone,
}: {
  base: string;
  candidateId: string;
  statement: string | null;
  canWithdraw: boolean;
  onDone: () => Promise<void>;
}) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const withdraw = async () => {
    setBusy(true);
    setError('');
    const r = await call(`${base}/candidates/${encodeURIComponent(candidateId)}/withdraw`, { method: 'POST' });
    setBusy(false);
    if (r.ok) await onDone();
    else setError(errorText(r));
  };

  return (
    <div className="rounded-xl border border-emerald-900/70 bg-emerald-950/20 p-5 sm:p-6">
      <h3 className="text-lg font-semibold text-white">You are standing in this election</h3>
      {statement ? <p className="mt-2 whitespace-pre-line text-sm text-slate-300">{statement}</p> : null}
      {error ? (
        <div className="mt-3">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}
      {canWithdraw ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {confirm ? (
            <>
              <span className="text-sm text-slate-300">Withdraw from this election? This cannot be undone.</span>
              <button type="button" className={dangerBtn} disabled={busy} onClick={() => void withdraw()}>
                Yes, withdraw
              </button>
              <button type="button" className={secondaryBtn} disabled={busy} onClick={() => setConfirm(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" className={secondaryBtn} onClick={() => setConfirm(true)}>
              Withdraw my candidacy
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

function BallotPanel({
  base,
  candidates,
  myChoices,
  castAt,
  votingCloseAt,
  onDone,
}: {
  base: string;
  candidates: CouncilCandidate[];
  myChoices: string[] | null;
  castAt: string | null;
  votingCloseAt: string | null;
  onDone: () => Promise<void>;
}) {
  const standingIds = new Set(candidates.map((c) => c.id));
  const recorded = (myChoices || []).filter((id) => standingIds.has(id));
  const [step, setStep] = useState<'recorded' | 'edit' | 'confirm'>(myChoices ? 'recorded' : 'edit');
  const [picked, setPicked] = useState<string[]>(recorded);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);

  const toggle = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  // Ballot order is the order Gov Hub returned (shuffled per viewer).
  const pickedInOrder = candidates.filter((c) => picked.includes(c.id));
  const nameOf = (id: string) => candidates.find((c) => c.id === id)?.name ?? 'A candidate who has withdrawn';

  const cast = async () => {
    setBusy(true);
    setError('');
    const r = await call(`${base}/ballot`, {
      method: 'POST',
      body: JSON.stringify({ choices: pickedInOrder.map((c) => c.id) }),
    });
    setBusy(false);
    if (r.ok) {
      await onDone();
      setStep('recorded');
    } else setError(errorText(r));
  };

  const withdraw = async () => {
    setBusy(true);
    setError('');
    const r = await call(`${base}/ballot`, { method: 'DELETE' });
    setBusy(false);
    setConfirmWithdraw(false);
    if (r.ok) {
      setPicked([]);
      setStep('edit');
      await onDone();
    } else setError(errorText(r));
  };

  const closeText = votingCloseAt ? <LocalTime iso={votingCloseAt} showPacific={false} /> : 'voting closes';

  if (!candidates.length) {
    return <Notice>There are no candidates standing in this election.</Notice>;
  }

  return (
    <div className={card}>
      <h3 className="text-lg font-semibold text-white">Your ballot</h3>

      {step === 'recorded' && myChoices ? (
        <div className="mt-3 space-y-4">
          <Notice tone="ok">
            <p className="font-medium">
              Your ballot is recorded – you can change it until {closeText}.
            </p>
            {castAt ? (
              <p className="mt-1 text-xs opacity-80">
                Last saved <LocalTime iso={castAt} showPacific={false} />
              </p>
            ) : null}
          </Notice>
          <div>
            <p className="text-sm text-slate-400">You approved:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-100">
              {(myChoices.length ? myChoices : []).map((id) => (
                <li key={id}>{nameOf(id)}</li>
              ))}
            </ul>
          </div>
          {error ? <Notice tone="error">{error}</Notice> : null}
          <div className="flex flex-wrap gap-3">
            <button type="button" className={primaryBtn} onClick={() => setStep('edit')} disabled={busy}>
              Change my ballot
            </button>
            {confirmWithdraw ? (
              <>
                <button type="button" className={dangerBtn} onClick={() => void withdraw()} disabled={busy}>
                  Yes, withdraw my ballot
                </button>
                <button type="button" className={secondaryBtn} onClick={() => setConfirmWithdraw(false)} disabled={busy}>
                  Keep it
                </button>
              </>
            ) : (
              <button type="button" className={secondaryBtn} onClick={() => setConfirmWithdraw(true)} disabled={busy}>
                Withdraw my ballot
              </button>
            )}
          </div>
        </div>
      ) : null}

      {step === 'edit' ? (
        <div className="mt-2">
          <p className="text-sm text-slate-400">
            Tick every candidate you approve of. You can tick as many as you like. The candidates with the most
            approvals are elected. Your ballot is secret.
          </p>
          <fieldset className="mt-4 space-y-2">
            <legend className="sr-only">Candidates</legend>
            {candidates.map((c) => {
              const on = picked.includes(c.id);
              return (
                <label
                  key={c.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 ${
                    on ? 'border-cyan-600 bg-cyan-950/30' : 'border-slate-800 bg-slate-950/40 hover:border-slate-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 accent-cyan-500"
                    checked={on}
                    onChange={() => toggle(c.id)}
                  />
                  <span className="text-slate-100">{c.name}</span>
                </label>
              );
            })}
          </fieldset>
          {error ? (
            <div className="mt-3">
              <Notice tone="error">{error}</Notice>
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className={primaryBtn} disabled={!picked.length} onClick={() => setStep('confirm')}>
              Review my ballot
            </button>
            {myChoices ? (
              <button
                type="button"
                className={secondaryBtn}
                onClick={() => {
                  setPicked(recorded);
                  setStep('recorded');
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {step === 'confirm' ? (
        <div className="mt-3 space-y-4">
          <p className="text-sm text-slate-300">
            You are approving {pickedInOrder.length} of {candidates.length}{' '}
            {candidates.length === 1 ? 'candidate' : 'candidates'}:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-slate-100">
            {pickedInOrder.map((c) => (
              <li key={c.id}>{c.name}</li>
            ))}
          </ul>
          <p className="text-sm text-slate-400">
            {myChoices ? 'This replaces your earlier ballot. ' : ''}You can change or withdraw it until {closeText}.
          </p>
          {error ? <Notice tone="error">{error}</Notice> : null}
          <div className="flex flex-wrap gap-3">
            <button type="button" className={primaryBtn} disabled={busy} onClick={() => void cast()}>
              {busy ? 'Recording…' : 'Cast my ballot'}
            </button>
            <button type="button" className={secondaryBtn} disabled={busy} onClick={() => setStep('edit')}>
              Back
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
