'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

type TicketSummary = {
  id: string;
  createdAt: string;
  status: string;
  subject: string;
  urgency: string;
  category: string;
};

const CATEGORIES = [
  { value: 'challenge_question', label: 'Challenge question' },
  { value: 'workgroup_help', label: 'Workgroup help' },
  { value: 'technical_support', label: 'Technical support' },
  { value: 'content_clarification', label: 'Content clarification' },
  { value: 'general', label: 'General' },
];

async function readFilesAsBase64(files: File[]) {
  const out: Array<{ filename: string; mimeType: string; dataBase64: string }> = [];
  for (const file of files.slice(0, 5)) {
    const dataBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        resolve(result.includes(',') ? result.split(',')[1] : result);
      };
      reader.onerror = () => reject(reader.error || new Error('Could not read file'));
      reader.readAsDataURL(file);
    });
    out.push({
      filename: file.name,
      mimeType: file.type || 'image/png',
      dataBase64,
    });
  }
  return out;
}

export default function SupportPageClient() {
  const { user, checked, login, loginBusy, loginError } = useAuth();
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [screenshots, setScreenshots] = useState<File[]>([]);

  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('challenge_question');
  const [urgency, setUrgency] = useState('non_blocking');
  const [body, setBody] = useState('');
  const [steps, setSteps] = useState('');
  const [expected, setExpected] = useState('');
  const [actual, setActual] = useState('');
  const [tried, setTried] = useState('');
  const [techAck, setTechAck] = useState(false);
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);

  const isTechnical = category === 'technical_support';
  const needsTechAck = isTechnical && screenshots.length === 0;

  const loadTickets = useCallback(async () => {
    const res = await fetch('/api/support/tickets', { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    if (data.ok && Array.isArray(data.tickets)) setTickets(data.tickets);
  }, []);

  useEffect(() => {
    if (user) void loadTickets();
  }, [user, loadTickets]);

  const diagnosticBundle = useMemo(() => {
    if (!includeDiagnostics) return null;
    return {
      pageUrl: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      platform: typeof navigator !== 'undefined' ? navigator.platform : '',
      language: typeof navigator !== 'undefined' ? navigator.language : '',
      viewport:
        typeof window !== 'undefined'
          ? { width: window.innerWidth, height: window.innerHeight }
          : null,
    };
  }, [includeDiagnostics]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFlash(null);
    setSubmitting(true);
    try {
      const screenshotPayload = screenshots.length ? await readFilesAsBase64(screenshots) : [];
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          body,
          category,
          urgency,
          screenshotAcknowledged: techAck,
          screenshots: screenshotPayload,
          pageUrl: typeof window !== 'undefined' ? window.location.href : '',
          browser: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          os: typeof navigator !== 'undefined' ? navigator.platform : '',
          stepsToReproduce: steps,
          expectedBehavior: expected,
          actualBehavior: actual,
          triedAlready: tried,
          diagnosticBundle,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message || 'Could not submit support request.');
        return;
      }
      setFlash(`Support request submitted. Reference: ${data.ticket.id}`);
      setSubject('');
      setBody('');
      setSteps('');
      setExpected('');
      setActual('');
      setTried('');
      setTechAck(false);
      setScreenshots([]);
      await loadTickets();
    } catch {
      setError('Could not submit support request.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-amber-300/90">Support</p>
      <h1 className="mt-2 text-3xl font-bold text-white">Desirable Properties support</h1>
      <p className="mt-4 text-slate-300">
        Questions about the challenge, workgroups, the book, or Canopi on chapter pages? Submit a
        support request here. Workgroup coordinators and contributors should include the DP number and any
        suggested text revisions when asking about content.
      </p>

      {!checked ? (
        <p className="mt-8 text-slate-400">Loading sign-in status…</p>
      ) : !user ? (
        <div className="mt-8 rounded-xl border border-slate-700 bg-slate-900/60 p-6">
          <p className="text-slate-300">
            Sign in to submit and track support requests.
          </p>
          {loginError ? (
            <p className="mt-4 rounded-lg border border-red-700/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">
              {loginError}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => {
              void login().catch(() => {
                // loginError set in auth context
              });
            }}
            disabled={loginBusy}
            className="mt-4 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-60"
          >
            {loginBusy ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      ) : (
        <>
          {flash ? (
            <p className="mt-6 rounded-lg border border-emerald-700/50 bg-emerald-950/40 px-4 py-3 text-emerald-200">
              {flash}
            </p>
          ) : null}
          {error ? (
            <p className="mt-6 rounded-lg border border-red-700/50 bg-red-950/40 px-4 py-3 text-red-200">
              {error}
            </p>
          ) : null}

          <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-4">
            <p className="text-xs text-slate-500">Fields marked * are required.</p>
            <div>
              <label htmlFor="support-subject" className="mb-1 block text-sm text-slate-300">
                Subject <span className="text-amber-300">*</span>
              </label>
              <input
                id="support-subject"
                required
                maxLength={200}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="support-category" className="mb-1 block text-sm text-slate-300">
                  Category
                </label>
                <select
                  id="support-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="support-urgency" className="mb-1 block text-sm text-slate-300">
                  Urgency
                </label>
                <select
                  id="support-urgency"
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                >
                  <option value="non_blocking">Non-blocking – question or minor issue</option>
                  <option value="blocking">Blocking – cannot proceed with review or workgroup work</option>
                  <option value="critical">Critical – production outage or data loss risk</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="support-body" className="mb-1 block text-sm text-slate-300">
                Message <span className="text-amber-300">*</span>
              </label>
              <textarea
                id="support-body"
                required
                maxLength={8000}
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Describe your question or issue. For DP review feedback, include the suggested revision text."
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </div>

            {isTechnical ? (
              <>
                <div>
                  <label htmlFor="support-steps" className="mb-1 block text-sm text-slate-300">
                    Steps to reproduce <span className="text-slate-500">(optional)</span>
                  </label>
                  <textarea
                    id="support-steps"
                    maxLength={4000}
                    rows={3}
                    value={steps}
                    onChange={(e) => setSteps(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="support-expected" className="mb-1 block text-sm text-slate-300">
                      Expected behavior <span className="text-slate-500">(optional)</span>
                    </label>
                    <input
                      id="support-expected"
                      maxLength={1000}
                      value={expected}
                      onChange={(e) => setExpected(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="support-actual" className="mb-1 block text-sm text-slate-300">
                      Actual behavior <span className="text-slate-500">(optional)</span>
                    </label>
                    <input
                      id="support-actual"
                      maxLength={1000}
                      value={actual}
                      onChange={(e) => setActual(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="support-tried" className="mb-1 block text-sm text-slate-300">
                    What I already tried <span className="text-slate-500">(optional)</span>
                  </label>
                  <textarea
                    id="support-tried"
                    maxLength={4000}
                    rows={2}
                    value={tried}
                    onChange={(e) => setTried(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  />
                </div>
              </>
            ) : null}

            <label className="flex items-start gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={includeDiagnostics}
                onChange={(e) => setIncludeDiagnostics(e.target.checked)}
                className="mt-1"
              />
              Include diagnostic info (page URL, browser) to help us investigate faster.
            </label>

            <div>
              <p className="mb-1 block text-sm text-slate-300">
                Screenshots <span className="text-slate-500">(optional, up to 5)</span>
              </p>
              <input
                id="support-screenshots"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                onChange={(e) => {
                  const added = Array.from(e.target.files || []);
                  setScreenshots((prev) => {
                    const merged = [...prev];
                    for (const file of added) {
                      if (merged.length >= 5) break;
                      const dup = merged.some(
                        (f) =>
                          f.name === file.name
                          && f.size === file.size
                          && f.lastModified === file.lastModified,
                      );
                      if (!dup) merged.push(file);
                    }
                    return merged;
                  });
                  e.target.value = '';
                }}
                className="sr-only"
              />
              <div className="flex flex-wrap items-center gap-3">
                <label
                  htmlFor="support-screenshots"
                  className={`inline-flex cursor-pointer rounded-lg border px-4 py-2 text-sm font-semibold ${
                    screenshots.length >= 5
                      ? 'cursor-not-allowed border-slate-700 text-slate-500'
                      : 'border-slate-600 text-slate-100 hover:border-slate-500'
                  }`}
                  aria-disabled={screenshots.length >= 5}
                >
                  {screenshots.length >= 5 ? 'Maximum reached' : 'Add screenshots'}
                </label>
                <span className="text-sm text-slate-400">
                  {screenshots.length === 0
                    ? 'No screenshots attached'
                    : `${screenshots.length} screenshot${screenshots.length === 1 ? '' : 's'} attached`}
                </span>
              </div>
              {screenshots.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm text-slate-400">
                  {screenshots.map((file, i) => (
                    <li key={`${file.name}-${file.lastModified}-${i}`} className="flex items-center gap-2">
                      <span className="truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setScreenshots((prev) => prev.filter((_, idx) => idx !== i))}
                        className="shrink-0 text-red-300 hover:text-red-200"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            {needsTechAck ? (
              <label className="flex items-start gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={techAck}
                  onChange={(e) => setTechAck(e.target.checked)}
                  className="mt-1"
                  required
                />
                I understand that if I do not provide screenshots, I may be asked to provide them.{' '}
                <span className="text-amber-300">*</span>
              </label>
            ) : null}

            <button
              type="submit"
              disabled={submitting || (needsTechAck && !techAck)}
              className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-60"
            >
              {submitting ? 'Sending…' : 'Submit support request'}
            </button>
          </form>

          {tickets.length > 0 ? (
            <section className="mt-12">
              <h2 className="text-lg font-semibold text-white">Your recent requests</h2>
              <ul className="mt-4 space-y-3">
                {tickets.map((t) => (
                  <li
                    key={t.id}
                    className="rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm"
                  >
                    <div className="font-medium text-white">{t.subject}</div>
                    <div className="mt-1 text-slate-400">
                      {t.status} · {t.category.replace(/_/g, ' ')} ·{' '}
                      {new Date(t.createdAt).toLocaleString()}
                    </div>
                    <div className="mt-1 font-mono text-xs text-slate-500">{t.id}</div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}

      <p className="mt-10 text-sm text-slate-500">
        Reading the book? Use Canopi on each chapter to discuss with the community, or open{' '}
        <Link href="/participate" className="text-cyan-300 hover:text-cyan-200">
          Participate
        </Link>{' '}
        to join a workgroup.
      </p>
    </div>
  );
}
