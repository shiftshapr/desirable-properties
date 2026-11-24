'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  ALERT_CHANNELS,
  CHANNEL_LABELS,
  choicesError,
  phoneCheckInWords,
  readAnnouncements,
  readChannels,
  type AlertChannel,
  type GovHubPhoneStatus,
  type PhoneChoices,
} from '@/lib/phone-optin/phone-core';
import { CONSENT_ALERTS, CONSENT_ANNOUNCEMENTS, TextAlertsAgreeLabel } from '@/lib/text-alerts-consent';

/**
 * Phone setting on /account (only rendered while PHONE_OPTIN is on). Add number -> code -> confirm -> masked number
 * with the phone check in plain words, alert choices, remove. Gov Hub keeps the number (src/lib/phone-optin).
 */

const NOT_AVAILABLE = 'Phone alerts are not available yet.';

type Msg = { tone: 'ok' | 'error'; text: string } | null;

const EMPTY_CHOICES: PhoneChoices = { alerts: false, channels: [], announcements: false, agree: false };

async function callPhoneApi(path: string, method: string, body?: unknown): Promise<{ ok: boolean; status: number; data: GovHubPhoneStatus & Record<string, unknown> }> {
  const res = await fetch(path, {
    method,
    credentials: 'include',
    headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => ({}))) as GovHubPhoneStatus & Record<string, unknown>;
  return { ok: res.ok, status: res.status, data };
}

/** Gov Hub's own messages are written for people; anything else becomes a plain fallback. */
function errorText(status: number, data: Record<string, unknown>): string {
  const err = typeof data.error === 'string' ? data.error : '';
  if (status === 401) return 'Sign in again to change your phone setting.';
  if (status === 404 || status >= 500 || !err || data.code) return NOT_AVAILABLE;
  return err;
}

function ChoiceBoxes({
  idPrefix,
  choices,
  onChange,
  disabled,
}: {
  idPrefix: string;
  choices: PhoneChoices;
  onChange: (next: PhoneChoices) => void;
  disabled: boolean;
}) {
  const toggleChannel = (c: AlertChannel, on: boolean) => {
    const set = new Set(choices.channels);
    if (on) set.add(c);
    else set.delete(c);
    onChange({ ...choices, channels: ALERT_CHANNELS.filter((x) => set.has(x)) });
  };
  return (
    <div className="mt-4 space-y-3">
      <label className="flex items-start gap-3 text-sm text-slate-200" htmlFor={`${idPrefix}-alerts`}>
        <input
          id={`${idPrefix}-alerts`}
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0"
          checked={choices.alerts}
          disabled={disabled}
          onChange={(e) => onChange({ ...choices, alerts: e.target.checked, channels: e.target.checked ? choices.channels : [] })}
        />
        <span>{CONSENT_ALERTS}</span>
      </label>
      {choices.alerts ? (
        <fieldset className="ml-7">
          <legend className="text-sm font-medium text-slate-200">Send me alerts by</legend>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300">
            {ALERT_CHANNELS.map((c) => (
              <label key={c} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={choices.channels.includes(c)}
                  disabled={disabled}
                  onChange={(e) => toggleChannel(c, e.target.checked)}
                />
                {CHANNEL_LABELS[c]}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <label className="flex items-start gap-3 text-sm text-slate-200" htmlFor={`${idPrefix}-announcements`}>
        <input
          id={`${idPrefix}-announcements`}
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0"
          checked={choices.announcements}
          disabled={disabled}
          onChange={(e) => onChange({ ...choices, announcements: e.target.checked })}
        />
        <span>{CONSENT_ANNOUNCEMENTS}</span>
      </label>
      <label className="flex items-start gap-3 text-sm text-slate-200" htmlFor={`${idPrefix}-agree`}>
        <input
          id={`${idPrefix}-agree`}
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0"
          checked={choices.agree}
          disabled={disabled}
          onChange={(e) => onChange({ ...choices, agree: e.target.checked })}
        />
        <TextAlertsAgreeLabel />
      </label>
    </div>
  );
}

export default function AccountPhoneSettings() {
  const { user, checked, login, loginBusy } = useAuth();
  const [status, setStatus] = useState<GovHubPhoneStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newChoices, setNewChoices] = useState<PhoneChoices>(EMPTY_CHOICES);
  const [currentChoices, setCurrentChoices] = useState<PhoneChoices>(EMPTY_CHOICES);
  const [changingNumber, setChangingNumber] = useState(false);

  const applyStatus = useCallback((s: GovHubPhoneStatus) => {
    setStatus(s);
    const channels = readChannels(s);
    const announcements = readAnnouncements(s) ?? false;
    // Saved choices show as ticked; the agree box is ticked when texts are already on (it was agreed to then).
    setCurrentChoices({ alerts: channels.length > 0, channels, announcements, agree: channels.length > 0 || announcements });
  }, []);

  // `loading` is only the first load; later reloads keep the current view until the answer arrives.
  const load = useCallback(async () => {
    try {
      const r = await callPhoneApi('/api/me/phone', 'GET');
      if (!r.ok) {
        setUnavailable(errorText(r.status, r.data));
        return;
      }
      if (r.data.available === false) {
        setUnavailable(typeof r.data.message === 'string' && r.data.message ? r.data.message : NOT_AVAILABLE);
        return;
      }
      setUnavailable(null);
      applyStatus(r.data);
    } catch {
      setUnavailable(NOT_AVAILABLE);
    } finally {
      setLoading(false);
    }
  }, [applyStatus]);

  useEffect(() => {
    if (!checked || !user) return;
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [checked, user, load]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
    } catch {
      setMsg({ tone: 'error', text: NOT_AVAILABLE });
    } finally {
      setBusy(false);
    }
  };

  const sendCode = () =>
    run(async () => {
      const problem = choicesError(newChoices);
      if (problem) return setMsg({ tone: 'error', text: problem });
      const r = await callPhoneApi('/api/me/phone/start', 'POST', { phone, ...newChoices });
      if (!r.ok) return setMsg({ tone: 'error', text: errorText(r.status, r.data) });
      setCode('');
      await load();
      setMsg({ tone: 'ok', text: `We texted a code to ${r.data.phone_masked ?? 'your number'}. It lasts 10 minutes.` });
    });

  const confirmCode = () =>
    run(async () => {
      const r = await callPhoneApi('/api/me/phone/confirm', 'POST', { code });
      if (!r.ok) {
        const left = typeof r.data.attempts_left === 'number' ? ` Tries left: ${r.data.attempts_left}.` : '';
        return setMsg({ tone: 'error', text: `${errorText(r.status, r.data)}${left}` });
      }
      setChangingNumber(false);
      setPhone('');
      setCode('');
      const wantedPromo = newChoices.announcements;
      setNewChoices(EMPTY_CHOICES);
      await load();
      const promoSaved = readAnnouncements(r.data);
      setMsg({
        tone: 'ok',
        text:
          wantedPromo && promoSaved === null
            ? 'Your number is confirmed. Announcements by text are not available yet, so that box was not saved.'
            : 'Your number is confirmed.',
      });
    });

  const cancelCode = () =>
    run(async () => {
      // Removing clears the pending code too (Gov Hub DELETE /api/me/phone); only offered when no number is confirmed.
      const r = await callPhoneApi('/api/me/phone', 'DELETE', {});
      if (!r.ok) return setMsg({ tone: 'error', text: errorText(r.status, r.data) });
      await load();
    });

  const saveChoices = () =>
    run(async () => {
      const problem = choicesError(currentChoices);
      if (problem) return setMsg({ tone: 'error', text: problem });
      const r = await callPhoneApi('/api/me/phone/channels', 'PUT', currentChoices);
      if (!r.ok) return setMsg({ tone: 'error', text: errorText(r.status, r.data) });
      applyStatus(r.data);
      const promoSaved = readAnnouncements(r.data);
      setMsg({
        tone: 'ok',
        text:
          currentChoices.announcements && promoSaved === null
            ? 'Alert choices saved. Announcements by text are not available yet, so that box was not saved.'
            : 'Alert choices saved.',
      });
    });

  const removeNumber = () =>
    run(async () => {
      if (!window.confirm('Remove your number? This deletes it and everything stored with it, and all text alerts stop.')) return;
      const r = await callPhoneApi('/api/me/phone', 'DELETE', {});
      if (!r.ok) return setMsg({ tone: 'error', text: errorText(r.status, r.data) });
      setChangingNumber(false);
      await load();
      setMsg({ tone: 'ok', text: 'Your number was removed. All text alerts are off.' });
    });

  const card = 'rounded-xl border border-slate-700 bg-slate-900 p-5';
  const primary = 'rounded-md bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-60';
  const secondary = 'rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-60';

  let body: React.ReactNode;
  if (!checked || (user && loading)) {
    body = <p className="text-sm text-slate-400">Loading…</p>;
  } else if (!user) {
    body = (
      <div>
        <p className="text-sm text-slate-300">Sign in to add a phone number.</p>
        <button type="button" className={`${primary} mt-3`} disabled={loginBusy} onClick={() => void login().catch(() => undefined)}>
          {loginBusy ? 'Signing in…' : 'Sign in'}
        </button>
      </div>
    );
  } else if (unavailable) {
    body = <p className="text-sm text-slate-300">{unavailable}</p>;
  } else if (status?.pending && (!status.verified || changingNumber)) {
    body = (
      <div>
        <p className="text-sm text-slate-300">
          Enter the code we texted to <strong className="text-white">{status.pending.phone_masked}</strong>.
        </p>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={10}
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="mt-3 w-40 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder:text-slate-500"
          aria-label="Code from the text"
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={primary} disabled={busy || !code.trim()} onClick={() => void confirmCode()}>
            Confirm
          </button>
          {!status.verified ? (
            <button type="button" className={secondary} disabled={busy} onClick={() => void cancelCode()}>
              Cancel
            </button>
          ) : null}
        </div>
      </div>
    );
  } else if (status?.verified && !changingNumber) {
    body = (
      <div>
        <p className="text-lg font-semibold text-white">{status.phone_masked}</p>
        <p className="mt-1 text-sm text-slate-300">{phoneCheckInWords(status)}</p>
        <ChoiceBoxes idPrefix="phone-current" choices={currentChoices} onChange={setCurrentChoices} disabled={busy} />
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className={primary} disabled={busy} onClick={() => void saveChoices()}>
            Save alert choices
          </button>
          <button type="button" className={secondary} disabled={busy} onClick={() => setChangingNumber(true)}>
            Use a different number
          </button>
          <button
            type="button"
            className="rounded-md border border-red-700 px-4 py-2 text-sm text-red-200 hover:bg-red-950 disabled:opacity-60"
            disabled={busy}
            onClick={() => void removeNumber()}
          >
            Remove number
          </button>
        </div>
      </div>
    );
  } else {
    body = (
      <div>
        <label className="block text-sm font-medium text-slate-200" htmlFor="phone-new-number">
          Phone number, with country code
        </label>
        <input
          id="phone-new-number"
          type="tel"
          autoComplete="tel"
          placeholder="+1 415 555 0123"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1 w-full max-w-sm rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder:text-slate-500"
        />
        <ChoiceBoxes idPrefix="phone-new" choices={newChoices} onChange={setNewChoices} disabled={busy} />
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className={primary} disabled={busy || !phone.trim()} onClick={() => void sendCode()}>
            Send code
          </button>
          {changingNumber ? (
            <button type="button" className={secondary} disabled={busy} onClick={() => setChangingNumber(false)}>
              Keep my current number
            </button>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Not required to use Desirable Properties. You can add a number without ticking any box: it then only
          confirms you have a real phone.
        </p>
      </div>
    );
  }

  return (
    <section id="phone" className={`${card} scroll-mt-24`} aria-labelledby="phone-heading">
      <h2 id="phone-heading" className="text-lg font-semibold text-white">Phone</h2>
      <p className="mt-1 text-sm text-slate-400">
        Optional. Only you can see your number. What we send and how to stop:{' '}
        <Link href="/text-alerts" className="text-cyan-300 hover:text-cyan-200">text alerts</Link>.
      </p>
      {msg ? (
        <p
          role="status"
          className={`mt-4 rounded-md px-3 py-2 text-sm ${msg.tone === 'ok' ? 'bg-emerald-950 text-emerald-200' : 'bg-red-950 text-red-200'}`}
        >
          {msg.text}
        </p>
      ) : null}
      <div className="mt-4">{body}</div>
    </section>
  );
}
