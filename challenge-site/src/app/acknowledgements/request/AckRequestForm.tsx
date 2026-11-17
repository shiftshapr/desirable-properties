'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  ACK_CALLS,
  ACK_IMAGE_ACCEPT,
  ACK_IMAGE_MAX,
  ACK_IMAGE_MESSAGES,
  ACK_LISTS,
  ACK_NAME_MAX,
  ACK_REQUEST_KINDS,
  ACK_TEXT_MAX,
  EMPTY_ACK_REQUEST,
  ackFieldsFor,
  ackRequestPayload,
  checkAckImage,
  checkAckRequest,
  type AckRequestForm as Form,
  type AckRequestKind,
} from '@/lib/ack-request';

const inputClass = 'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white';
const labelClass = 'mb-1 block text-sm text-slate-300';

type Attached = { key: string; file: File; url: string };

type Prefill = { name?: string; email?: string; listed_as?: { name: string; list: string; line: string } | null };

function Field({ id, label, required, hint, error, children }: {
  id: string; label: string; required?: boolean; hint?: string; error?: string; children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label} {required ? <span className="text-amber-300">*</span> : null}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      {error ? <p className="mt-1 text-sm text-red-300" role="alert">{error}</p> : null}
    </div>
  );
}

export default function AckRequestForm() {
  const params = useSearchParams();
  const { user, checked, login, loginBusy } = useAuth();
  const initialKind = ACK_REQUEST_KINDS.some((k) => k.value === params.get('kind'))
    ? (params.get('kind') as AckRequestKind)
    : '';
  const [form, setForm] = useState<Form>({ ...EMPTY_ACK_REQUEST, kind: initialKind });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [listedAs, setListedAs] = useState<Prefill['listed_as']>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [images, setImages] = useState<Attached[]>([]);
  const startedAt = useRef<number>(0);
  const prefilledFor = useRef<string | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const imageUrls = useRef<string[]>([]);

  // Free the preview URLs when the form goes away.
  useEffect(() => () => imageUrls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const clearImageError = () => setErrors((e) => {
    if (!e.images) return e;
    const next = { ...e };
    delete next.images;
    return next;
  });

  function addImages(list: FileList | null) {
    const chosen = Array.from(list || []);
    if (imageInput.current) imageInput.current.value = ''; // the same file can be chosen again
    if (!chosen.length) return;
    const problems: string[] = [];
    const added: Attached[] = [];
    for (const file of chosen) {
      if (images.length + added.length >= ACK_IMAGE_MAX) {
        problems.push(ACK_IMAGE_MESSAGES.count);
        break;
      }
      const problem = checkAckImage(file);
      if (problem) {
        problems.push(`${file.name}: ${problem}`);
        continue;
      }
      const url = URL.createObjectURL(file);
      imageUrls.current.push(url);
      added.push({ key: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`, file, url });
    }
    if (added.length) setImages((prev) => [...prev, ...added].slice(0, ACK_IMAGE_MAX));
    if (problems.length) setErrors((e) => ({ ...e, images: problems.join(' ') }));
    else clearImageError();
  }

  function removeImage(key: string) {
    setImages((prev) => {
      const gone = prev.find((a) => a.key === key);
      if (gone) {
        URL.revokeObjectURL(gone.url);
        imageUrls.current = imageUrls.current.filter((u) => u !== gone.url);
      }
      return prev.filter((a) => a.key !== key);
    });
    clearImageError();
    setTimeout(() => imageInput.current?.focus(), 0); // the input comes back once below the limit
  }

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  // Signed in: fill in what Gov Hub knows (name, email, current entry). Never overwrite typing.
  useEffect(() => {
    if (!user || prefilledFor.current === user.id) return;
    prefilledFor.current = user.id;
    void fetch('/api/acknowledgements/requests/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: (Prefill & { ok?: boolean }) | null) => {
        if (!data?.ok) return;
        setListedAs(data.listed_as || null);
        setForm((f) => ({
          ...f,
          requestedName: f.requestedName || data.name || '',
          currentName: f.currentName || data.listed_as?.name || '',
          email: f.email || data.email || '',
        }));
      })
      .catch(() => {});
  }, [user]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key as string]) return e;
      const next = { ...e };
      delete next[key as string];
      return next;
    });
  };

  const show = ackFieldsFor(form.kind);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFailure(null);
    const found = checkAckRequest(form);
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById(`ack-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      const payload = ackRequestPayload(form, Date.now() - startedAt.current);
      let init: RequestInit;
      if (images.length) {
        // With images: multipart, so the files go as they are (the browser sets the boundary).
        const body = new FormData();
        body.set('payload', JSON.stringify(payload));
        for (const a of images) body.append('images', a.file, a.file.name);
        init = { method: 'POST', body };
      } else {
        init = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
      }
      const res = await fetch('/api/acknowledgements/requests', init);
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; reference?: string; message?: string; errors?: Record<string, string> }
        | null;
      if (res.ok && data?.ok && data.reference) {
        setReference(data.reference);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (data?.errors?.images) {
        setErrors((e) => ({ ...e, images: data.errors!.images }));
        imageInput.current?.focus();
      } else if (data?.errors?.attachments) {
        setErrors((e) => ({ ...e, images: data.errors!.attachments }));
      }
      setFailure(res.status === 413
        ? ACK_IMAGE_MESSAGES.size
        : data?.message || 'We could not send your request just now. Please try again in a few minutes.');
    } catch {
      setFailure('We could not send your request just now. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  if (reference) {
    return (
      <div className="mt-8 rounded-xl border border-emerald-700/60 bg-emerald-950/30 p-6" role="status">
        <h2 className="text-xl font-semibold text-white">Thank you. We have your request.</h2>
        <p className="mt-3 text-slate-200">
          Your reference is <strong className="font-mono text-emerald-200">{reference}</strong>. Please keep it: if
          you get in touch about this request, quote it so we can find it.
        </p>
        <p className="mt-3 text-sm text-slate-300">
          We do not send a confirmation email. The steering committee will review your request, and if we need
          to ask you something we will write to the email you gave. Accepted changes appear in Version 1.1 of
          the book.
        </p>
        <p className="mt-4 text-sm">
          <a href="/viewer/acknowledgements" className="text-cyan-300 underline hover:text-cyan-200">Back to the Acknowledgements</a>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-6" noValidate>
      {checked && !user ? (
        <p className="rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
          You do not need to sign in. If you have a Desirable Properties account,{' '}
          <button type="button" onClick={() => void login().catch(() => {})} disabled={loginBusy}
            className="text-cyan-300 underline hover:text-cyan-200 disabled:opacity-60">
            {loginBusy ? 'signing in…' : 'sign in'}
          </button>{' '}
          and we will fill in what we know.
        </p>
      ) : null}
      {user && listedAs ? (
        <p className="rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
          You are listed under {listedAs.list === 'editors' ? 'Editors' : 'Contributors'} as:{' '}
          <span className="text-white">{listedAs.line}</span>
        </p>
      ) : null}

      <fieldset>
        <legend className="mb-2 text-sm text-slate-300">
          What would you like us to do? <span className="text-amber-300">*</span>
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {ACK_REQUEST_KINDS.map((k, i) => (
            <label key={k.value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 ${form.kind === k.value ? 'border-cyan-500 bg-cyan-950/30' : 'border-slate-700 bg-slate-900/40 hover:border-slate-500'}`}>
              <input type="radio" name="kind" value={k.value} id={i === 0 ? 'ack-kind' : undefined}
                checked={form.kind === k.value} onChange={() => set('kind', k.value)} className="mt-1" />
              <span>
                <span className="block font-medium text-white">{k.label}</span>
                <span className="block text-xs text-slate-400">{k.hint}</span>
              </span>
            </label>
          ))}
        </div>
        {errors.kind ? <p className="mt-1 text-sm text-red-300" role="alert">{errors.kind}</p> : null}
      </fieldset>

      {form.kind === 'remove' ? (
        <p className="text-sm text-slate-400">
          To be removed we only need the name as it appears now and an email address. You do not have to give a
          reason.
        </p>
      ) : null}

      {form.kind ? (
        <>
          {show.requestedName ? (
            <Field id="ack-requestedName" label="Your name as it should appear" required
              hint="Your real name, as you want it printed. Not a username or handle." error={errors.requestedName}>
              <input id="ack-requestedName" className={inputClass} maxLength={ACK_NAME_MAX} autoComplete="name"
                value={form.requestedName} onChange={(e) => set('requestedName', e.target.value)} />
            </Field>
          ) : null}
          {show.currentName ? (
            <Field id="ack-currentName" label="Your name as it appears now"
              required={form.kind === 'remove' || form.kind === 'correct_name'}
              hint={form.kind === 'remove' ? undefined : 'If you are listed, copy the name from the Acknowledgements.'}
              error={errors.currentName}>
              <input id="ack-currentName" className={inputClass} maxLength={ACK_NAME_MAX}
                autoComplete={form.kind === 'remove' ? 'name' : 'off'}
                value={form.currentName} onChange={(e) => set('currentName', e.target.value)} />
            </Field>
          ) : null}
          {show.affiliation ? (
            <Field id="ack-affiliation" label="The affiliation as it should appear" required error={errors.affiliation}
              hint="For example an organisation or university. Leave a note if you want an affiliation removed.">
              <input id="ack-affiliation" className={inputClass} maxLength={200} autoComplete="organization"
                value={form.affiliation} onChange={(e) => set('affiliation', e.target.value)} />
            </Field>
          ) : null}
          {show.targetList ? (
            <Field id="ack-targetList" label="The list you should be in" required error={errors.targetList}>
              <select id="ack-targetList" className={inputClass} value={form.targetList}
                onChange={(e) => set('targetList', e.target.value)}>
                <option value="">Choose a list</option>
                {ACK_LISTS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </Field>
          ) : null}
          {show.contribution ? (
            <fieldset className="space-y-4 rounded-xl border border-slate-800 p-4">
              <legend className="px-1 text-sm text-slate-300">
                What you contributed, and where{form.kind === 'add' ? <span className="text-amber-300"> *</span> : null}
              </legend>
              <Field id="ack-callForInput" label="Which part of the work?">
                <select id="ack-callForInput" className={inputClass} value={form.callForInput}
                  onChange={(e) => set('callForInput', e.target.value)}>
                  <option value="">Choose one (optional)</option>
                  {ACK_CALLS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </Field>
              <Field id="ack-contribution" label="What you contributed" error={errors.contribution}
                hint="A sentence or two is enough: a submission, a proposal, a review, a meeting.">
                <textarea id="ack-contribution" className={inputClass} rows={3} maxLength={ACK_TEXT_MAX}
                  value={form.contribution} onChange={(e) => set('contribution', e.target.value)} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="ack-contributionUrl" label="A link (optional)" hint="A proposal, patch or submission."
                  error={errors.contributionUrl}>
                  <input id="ack-contributionUrl" type="url" inputMode="url" className={inputClass} maxLength={500}
                    placeholder="https://" value={form.contributionUrl}
                    onChange={(e) => set('contributionUrl', e.target.value)} />
                </Field>
                <Field id="ack-role" label="A role (optional)" hint="For example: co-editor of DP8.">
                  <input id="ack-role" className={inputClass} maxLength={120} value={form.role}
                    onChange={(e) => set('role', e.target.value)} />
                </Field>
              </div>
            </fieldset>
          ) : null}
          <Field id="ack-email" label="Your email" required error={errors.email}
            hint="Only so we can reach you about this request. We do not send a confirmation email.">
            <input id="ack-email" type="email" className={inputClass} maxLength={254} autoComplete="email"
              value={form.email} onChange={(e) => set('email', e.target.value)} />
          </Field>
          <Field id="ack-note" label={form.kind === 'other' ? 'What would you like changed?' : 'Anything else (optional)'}
            required={form.kind === 'other'} error={errors.note}>
            <textarea id="ack-note" className={inputClass} rows={3} maxLength={ACK_TEXT_MAX}
              value={form.note} onChange={(e) => set('note', e.target.value)} />
          </Field>
          <div>
            <label htmlFor="ack-images" className={labelClass}>Attach an image (optional)</label>
            <p id="ack-images-hint" className="mb-2 text-xs text-slate-500">
              For example a screenshot of the problem, a photo, or proof of your contribution. Up to {ACK_IMAGE_MAX}{' '}
              images, JPEG, PNG or WebP, 5 MB each. Only the steering committee sees them; we remove location and
              camera details before storing them.
            </p>
            {images.length < ACK_IMAGE_MAX ? (
              <input ref={imageInput} id="ack-images" type="file" accept={ACK_IMAGE_ACCEPT} multiple
                aria-describedby={`ack-images-hint${errors.images ? ' ack-images-error' : ''}`}
                aria-invalid={errors.images ? true : undefined}
                onChange={(e) => addImages(e.target.files)}
                className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-700" />
            ) : (
              <p className="text-sm text-slate-400">You have attached {ACK_IMAGE_MAX} images, the most we take. Remove one to choose another.</p>
            )}
            {images.length ? (
              <ul className="mt-3 flex flex-wrap gap-3" aria-label="Attached images">
                {images.map((a, i) => (
                  <li key={a.key} className="w-28">
                    {/* eslint-disable-next-line @next/next/no-img-element -- a local preview (blob: URL), not a site image */}
                    <img src={a.url} alt={`Preview of image ${i + 1}: ${a.file.name}`}
                      className="h-28 w-28 rounded-lg border border-slate-700 object-cover" />
                    <p className="mt-1 truncate text-xs text-slate-400" title={a.file.name}>{a.file.name}</p>
                    <button type="button" onClick={() => removeImage(a.key)}
                      aria-label={`Remove image ${i + 1}: ${a.file.name}`}
                      className="mt-1 text-xs text-red-300 underline hover:text-red-200">Remove</button>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="sr-only" aria-live="polite">
              {images.length ? `${images.length} of ${ACK_IMAGE_MAX} images attached.` : ''}
            </p>
            {errors.images ? (
              <p id="ack-images-error" className="mt-1 text-sm text-red-300" role="alert">{errors.images}</p>
            ) : null}
          </div>
          {/* Honeypot: hidden from people and screen readers; scripts fill it. */}
          <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
            <label htmlFor="ack-website">Website</label>
            <input id="ack-website" tabIndex={-1} autoComplete="off" value={form.website}
              onChange={(e) => set('website', e.target.value)} />
          </div>
          {failure ? (
            <p className="rounded-lg border border-red-700/50 bg-red-950/40 px-4 py-3 text-red-200" role="alert">{failure}</p>
          ) : null}
          <button type="submit" disabled={busy}
            className="rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-60">
            {busy ? (images.length ? 'Sending, with your images…' : 'Sending…') : form.kind === 'remove' ? 'Send removal request' : 'Send request'}
          </button>
        </>
      ) : null}
    </form>
  );
}
