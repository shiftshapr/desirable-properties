'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import PearlMark from '@/components/badges/PearlMark';
import ComposeFieldAiAssist, {
  type ComposeAiPromptOption,
} from '@/components/compose/ComposeFieldAiAssist';
import DiscussPatchLink from '@/components/DiscussPatchLink';
import {
  clearPearlDraft,
  loadPearlDraft,
  savePearlDraft,
} from '@/lib/compose-draft-storage';
import { useAuth } from '@/lib/auth-context';
import { bookIntroDiscussHref, GOVHUB_DP_PATCHES_URL } from '@/lib/govhub';

type PearlState = {
  patchIdea: string;
  socializeUrl: string;
  socializeNote: string;
  feedbackSummary: string;
  feedbackFrom: string;
  reflection: string;
  patchVerified: boolean;
  patchVerifiedHref: string | null;
  patchVerifiedSource: string | null;
  status: 'draft' | 'submitted';
};

const AI_PROMPTS: ComposeAiPromptOption[] = [
  { id: 'start', label: 'Help me draft a patch idea', requiresDraft: false },
  { id: 'clarify', label: 'Clarify my thinking' },
  { id: 'expand', label: 'Expand' },
  { id: 'dp', label: 'Connect to a Desirable Property' },
  { id: 'reflect', label: 'Strengthen my reflection' },
];

const AI_INSTRUCTIONS: Record<string, string> = {
  start:
    'The field is empty. Suggest 2–3 concrete patch angles or starter sentences the participant could develop. Keep it practical for Gov Hub or Canopi.',
  clarify: 'Clarify and sharpen the ideas in the draft.',
  expand: 'Expand the draft with supporting detail and examples. Stay on topic.',
  dp: 'Connect this patch idea to relevant Desirable Properties.',
  reflect: 'Strengthen this reflection: be specific about what changed and why it matters.',
};

function AiTextarea({
  label,
  value,
  onChange,
  seriesTitle,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  seriesTitle: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function onGenerate(
    option: ComposeAiPromptOption,
    context: { draft: string; selection: string },
    signal: AbortSignal,
  ) {
    const userDraft = context.selection.trim() || context.draft.trim();
    const instruction = AI_INSTRUCTIONS[option.id] || option.label;
    const message = [
      `PEARL track for event series: ${seriesTitle}`,
      `Field: ${label}`,
      userDraft ? `Current draft:\n${userDraft}\n\n---\n\n` : 'The field is currently empty.\n\n---\n\n',
      instruction,
    ]
      .filter(Boolean)
      .join('\n');

    const res = await fetch('/api/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history: [], surface: 'desirableproperties.org/series/pearl' }),
      signal,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'AI request failed');
    return data.response || '';
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-slate-200">{label}</label>
      <textarea
        ref={textareaRef}
        rows={2}
        className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 pb-10 text-sm text-slate-100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <ComposeFieldAiAssist
        textareaRef={textareaRef}
        value={value}
        onValueChange={onChange}
        promptOptions={AI_PROMPTS}
        onGenerate={onGenerate}
        fieldLabel={label}
      />
    </div>
  );
}

type Props = {
  seriesSlug: string;
  seriesTitle: string;
  pearlBadgeCode: string | null;
  initial: PearlState;
};

export default function PearlTrackForm({ seriesSlug, seriesTitle, pearlBadgeCode, initial }: Props) {
  const { user, checked, login, loginBusy } = useAuth();
  const [state, setState] = useState<PearlState>(initial);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftHydrated, setDraftHydrated] = useState(false);

  useEffect(() => {
    const local = loadPearlDraft(seriesSlug);
    if (local) {
      setState((prev) => ({
        ...prev,
        patchIdea: local.patchIdea,
        socializeUrl: local.socializeUrl,
        socializeNote: local.socializeNote,
        feedbackSummary: local.feedbackSummary,
        feedbackFrom: local.feedbackFrom,
        reflection: local.reflection,
      }));
    }
    setDraftHydrated(true);
  }, [seriesSlug]);

  useEffect(() => {
    if (!draftHydrated) return;
    savePearlDraft(seriesSlug, {
      patchIdea: state.patchIdea,
      socializeUrl: state.socializeUrl,
      socializeNote: state.socializeNote,
      feedbackSummary: state.feedbackSummary,
      feedbackFrom: state.feedbackFrom,
      reflection: state.reflection,
    });
  }, [state, draftHydrated, seriesSlug]);

  const save = useCallback(
    async (submit = false) => {
      if (!user) return;
      setSaving(true);
      setError(null);
      try {
        const res = await fetch(`/api/series/${encodeURIComponent(seriesSlug)}/pearl`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...state, submit }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Save failed');
        if (data.pearl) {
          setState({
            patchIdea: data.pearl.patchIdea || '',
            socializeUrl: data.pearl.socializeUrl || '',
            socializeNote: data.pearl.socializeNote || '',
            feedbackSummary: data.pearl.feedbackSummary || '',
            feedbackFrom: data.pearl.feedbackFrom || '',
            reflection: data.pearl.reflection || '',
            patchVerified: Boolean(data.pearl.patchVerified),
            patchVerifiedHref: data.pearl.patchVerifiedHref || null,
            patchVerifiedSource: data.pearl.patchVerifiedSource || null,
            status: data.pearl.status === 'submitted' ? 'submitted' : 'draft',
          });
        }
        setFlash(submit ? 'PEARL track submitted. Badge unlocked!' : 'Saved.');
        if (submit) clearPearlDraft(seriesSlug);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed');
      } finally {
        setSaving(false);
      }
    },
    [seriesSlug, state, user],
  );

  const checkPatch = useCallback(async () => {
    if (!user) return;
    setChecking(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/series/${encodeURIComponent(seriesSlug)}/pearl/patch-status`,
        { method: 'POST' },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Check failed');
      if (data.pearl) {
        setState((prev) => ({
          ...prev,
          patchVerified: Boolean(data.pearl.patchVerified),
          patchVerifiedHref: data.pearl.patchVerifiedHref || null,
          patchVerifiedSource: data.pearl.patchVerifiedSource || null,
        }));
      }
      setFlash(data.verified ? 'Patch found!' : 'No patch found yet. Try again after posting.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check failed');
    } finally {
      setChecking(false);
    }
  }, [seriesSlug, user]);

  useEffect(() => {
    if (!user) return;
    void checkPatch();
  }, [user, checkPatch]);

  if (!checked) return <p className="text-sm text-slate-400">Loading…</p>;

  if (!user) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <p className="flex items-center gap-2 text-slate-300">
          <PearlMark size={18} />
          Sign in to start the PEARL patch track.
        </p>
        <button
          type="button"
          onClick={() => void login()}
          disabled={loginBusy}
          className="mt-4 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {flash ? (
        <p className="rounded-md border border-cyan-800/50 bg-cyan-950/30 px-4 py-2 text-sm text-cyan-200">
          {flash}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-rose-800/50 bg-rose-950/30 px-4 py-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-white">1. Patch idea</h3>
        <AiTextarea
          label="What patch do you want to propose?"
          value={state.patchIdea}
          onChange={(v) => setState((p) => ({ ...p, patchIdea: v }))}
          seriesTitle={seriesTitle}
        />
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-white">2. Socialize</h3>
        <label className="block text-sm font-medium text-slate-200">Link where you shared it</label>
        <input
          type="url"
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
          value={state.socializeUrl}
          onChange={(e) => setState((p) => ({ ...p, socializeUrl: e.target.value }))}
          placeholder="Discuss, workgroup, office hours…"
        />
        <label className="block text-sm font-medium text-slate-200">Note</label>
        <textarea
          rows={2}
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
          value={state.socializeNote}
          onChange={(e) => setState((p) => ({ ...p, socializeNote: e.target.value }))}
        />
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-white">3. Feedback</h3>
        <AiTextarea
          label="Feedback you received"
          value={state.feedbackSummary}
          onChange={(v) => setState((p) => ({ ...p, feedbackSummary: v }))}
          seriesTitle={seriesTitle}
        />
        <label className="block text-sm font-medium text-slate-200">From whom</label>
        <select
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
          value={state.feedbackFrom}
          onChange={(e) => setState((p) => ({ ...p, feedbackFrom: e.target.value }))}
        >
          <option value="">Select…</option>
          <option value="peer">Peer</option>
          <option value="coordinator">Coordinator</option>
          <option value="public">Public / community</option>
          <option value="other">Other</option>
        </select>
      </section>

      <section className="space-y-4 rounded-xl border border-violet-900/40 bg-violet-950/20 p-5">
        <h3 className="text-lg font-semibold text-white">4. Submit patch</h3>
        <p className="text-sm text-slate-400">
          Post your patch on Gov Hub or use <code className="text-cyan-300">PATCH:</code> /{' '}
          <code className="text-cyan-300">INSERT:</code> in Canopi Discuss. We detect it automatically.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href={GOVHUB_DP_PATCHES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
          >
            Patch on Gov Hub
          </a>
          <DiscussPatchLink
            href={bookIntroDiscussHref()}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-slate-400"
          >
            Discuss &amp; Patch (book)
          </DiscussPatchLink>
          <button
            type="button"
            onClick={() => void checkPatch()}
            disabled={checking}
            className="rounded-lg border border-violet-700 px-4 py-2 text-sm text-violet-200 hover:border-violet-500 disabled:opacity-50"
          >
            {checking ? 'Checking…' : 'Check for my patch'}
          </button>
        </div>
        {state.patchVerified ? (
          <p className="text-sm text-emerald-300">
            Patch found ({state.patchVerifiedSource}){' '}
            {state.patchVerifiedHref ? (
              <a
                href={state.patchVerifiedHref}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                View patch
              </a>
            ) : null}
          </p>
        ) : (
          <p className="text-sm text-amber-200">Not found yet. Submit a patch, then check again.</p>
        )}
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-white">5. Reflect</h3>
        <AiTextarea
          label="What changed after feedback? What did you learn?"
          value={state.reflection}
          onChange={(v) => setState((p) => ({ ...p, reflection: v }))}
          seriesTitle={seriesTitle}
        />
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void save(false)}
          disabled={saving}
          className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => void save(true)}
          disabled={saving || !state.patchVerified}
          className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
        >
          {state.status === 'submitted' ? 'Update PEARL submission' : 'Submit PEARL track'}
        </button>
        {pearlBadgeCode && state.status === 'submitted' ? (
          <span className="flex items-center gap-1.5 self-center text-sm text-emerald-300">
            <PearlMark size={16} />
            PEARL badge: {pearlBadgeCode}
          </span>
        ) : null}
        <Link href={`/series/${seriesSlug}`} className="self-center text-sm text-cyan-300">
          ← Back to series
        </Link>
      </div>
    </div>
  );
}
