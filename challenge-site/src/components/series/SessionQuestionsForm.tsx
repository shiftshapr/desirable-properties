'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import ComposeFieldAiAssist, {
  type ComposeAiPromptOption,
} from '@/components/compose/ComposeFieldAiAssist';
import { useAuth } from '@/lib/auth-context';

export const SUBMIT_CONSENT_SECTION_KEY = 'submit';

type Question = {
  id: string;
  fieldKey: string;
  label: string;
  helpText: string | null;
  fieldType: string;
  required: boolean;
  aiAssist: boolean;
  minLength: number | null;
};

type Section = {
  id: string;
  sectionKey: string;
  title: string;
  questions: Question[];
};

type AnswerMap = Record<string, { valueText?: string | null; valueBool?: boolean | null }>;

const AI_PROMPTS: ComposeAiPromptOption[] = [
  { id: 'start', label: 'Help me get started', requiresDraft: false },
  { id: 'clarify', label: 'Clarify my thinking' },
  { id: 'expand', label: 'Expand' },
  { id: 'dp', label: 'Connect to a Desirable Property' },
  { id: 'strengthen', label: 'Strengthen for submission' },
  { id: 'shorter', label: 'Shorter version' },
];

const AI_INSTRUCTIONS: Record<string, string> = {
  start:
    'The field is empty. Offer 2–3 short starter angles, reflective questions, or example opening sentences the participant could build on. Do not write a full polished answer—help them begin.',
  clarify: 'Clarify and sharpen the ideas in the draft. Ask one reflective question if helpful.',
  expand: 'Expand the draft with supporting detail and examples. Stay on topic and in the participant\'s voice.',
  dp: 'Connect this thinking to relevant Desirable Properties from the session context.',
  strengthen: 'Strengthen this draft for submission: be specific, concrete, and honest.',
  shorter: 'Produce a shorter version that keeps the core insight.',
};

function QuestionField({
  question,
  value,
  onChange,
  seriesTitle,
  sessionTitle,
  relatedDpIds,
}: {
  question: Question;
  value: { valueText?: string | null; valueBool?: boolean | null };
  onChange: (next: { valueText?: string | null; valueBool?: boolean | null }) => void;
  seriesTitle: string;
  sessionTitle: string;
  relatedDpIds: string[];
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const text = value.valueText ?? '';
  const minLength = question.minLength;

  function setText(next: string) {
    onChange({ valueText: next });
  }

  async function onGenerate(
    option: ComposeAiPromptOption,
    context: { draft: string; selection: string },
    signal: AbortSignal,
  ) {
    const userDraft = context.selection.trim() || context.draft.trim();
    const instruction = AI_INSTRUCTIONS[option.id] || option.label;
    const message = [
      `Event series: ${seriesTitle}`,
      `Session: ${sessionTitle}`,
      relatedDpIds.length ? `Related DPs: ${relatedDpIds.join(', ')}` : '',
      `Question: ${question.label}`,
      '',
      userDraft ? `Current draft:\n${userDraft}\n\n---\n\n` : 'The field is currently empty.\n\n---\n\n',
      instruction,
    ]
      .filter(Boolean)
      .join('\n');

    const res = await fetch('/api/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history: [], surface: 'desirableproperties.org/series' }),
      signal,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'AI request failed');
    return data.response || '';
  }

  if (question.fieldType === 'checkbox') {
    return (
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        <input
          type="checkbox"
          className="mt-1"
          checked={Boolean(value.valueBool)}
          onChange={(e) => onChange({ valueBool: e.target.checked })}
        />
        <span className="text-sm text-slate-200">{question.label}</span>
      </label>
    );
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-slate-200">{question.label}</label>
      {question.helpText ? (
        <p className="mt-1 text-xs text-slate-500">{question.helpText}</p>
      ) : null}
      <textarea
        ref={textareaRef}
        rows={4}
        className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {minLength != null ? (
        <p
          className={`mt-1 text-right text-xs ${
            text.trim().length >= minLength ? 'text-emerald-400' : 'text-amber-400'
          }`}
        >
          {text.trim().length}/{minLength} minimum
        </p>
      ) : null}
      {question.aiAssist ? (
        <ComposeFieldAiAssist
          textareaRef={textareaRef}
          value={text}
          onValueChange={setText}
          promptOptions={AI_PROMPTS}
          onGenerate={onGenerate}
          fieldLabel={question.label}
        />
      ) : null}
    </div>
  );
}

type Props = {
  seriesSlug: string;
  sessionNumber: number;
  seriesTitle: string;
  sessionTitle: string;
  relatedDpIds: string[];
  sections: Section[];
  initialAttended: boolean;
  initialStatus: 'draft' | 'submitted';
  initialAnswers: AnswerMap;
};

export default function SessionQuestionsForm({
  seriesSlug,
  sessionNumber,
  seriesTitle,
  sessionTitle,
  relatedDpIds,
  sections,
  initialAttended,
  initialStatus,
  initialAnswers,
}: Props) {
  const { user, checked, login, loginBusy } = useAuth();
  const [attended, setAttended] = useState(initialAttended);
  const [answers, setAnswers] = useState<AnswerMap>(initialAnswers);
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasUserEdited = useRef(false);

  const markEdited = useCallback(() => {
    hasUserEdited.current = true;
  }, []);

  const save = useCallback(
    async (submit = false, fromAutosave = false) => {
      if (!user) return;

      if (submit) {
        for (const section of sections) {
          for (const q of section.questions) {
            if (q.required && q.fieldType === 'checkbox' && !answers[q.id]?.valueBool) {
              setError(`Please confirm: "${q.label}"`);
              return;
            }
            if (q.minLength == null) continue;
            const val = (answers[q.id]?.valueText ?? '').trim();
            if (val.length < q.minLength) {
              setError(
                `"${q.label}" needs at least ${q.minLength} characters (currently ${val.length}).`,
              );
              return;
            }
          }
        }
      }

      setSaving(true);
      setError(null);
      try {
        const payload = {
          attendedConfirmed: attended,
          submit,
          answers: Object.entries(answers).map(([questionId, val]) => ({
            questionId,
            valueText: val.valueText ?? null,
            valueBool: val.valueBool ?? null,
          })),
        };
        const res = await fetch(
          `/api/series/${encodeURIComponent(seriesSlug)}/session/${sessionNumber}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Save failed');
        if (submit) setStatus('submitted');
        if (submit) {
          setFlash('Session questions submitted.');
        } else if (!fromAutosave || hasUserEdited.current) {
          setFlash('Draft saved.');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed');
      } finally {
        setSaving(false);
      }
    },
    [answers, attended, seriesSlug, sessionNumber, user, sections],
  );

  useEffect(() => {
    if (!user || !hasUserEdited.current) return;
    const t = window.setTimeout(() => {
      void save(false, true);
    }, 2000);
    return () => window.clearTimeout(t);
  }, [answers, attended, user, save]);

  const { contentSections, consentSection } = useMemo(() => {
    const consent = sections.find((s) => s.sectionKey === SUBMIT_CONSENT_SECTION_KEY) ?? null;
    const content = sections.filter((s) => s.sectionKey !== SUBMIT_CONSENT_SECTION_KEY);
    return { contentSections: content, consentSection: consent };
  }, [sections]);

  if (!checked) {
    return <p className="text-sm text-slate-400">Loading…</p>;
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <p className="text-slate-300">Sign in to save session questions and earn the series badge.</p>
        <button
          type="button"
          onClick={() => void login()}
          disabled={loginBusy}
          className="mt-4 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
        >
          {loginBusy ? 'Signing in…' : 'Sign in'}
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

      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        <input
          type="checkbox"
          checked={attended}
          onChange={(e) => {
            markEdited();
            setAttended(e.target.checked);
          }}
        />
        <span className="text-sm text-slate-200">I attended or watched this session</span>
      </label>

      {contentSections.map((section) => (
        <section key={section.id} className="space-y-4">
          <h3 className="text-lg font-semibold text-white">{section.title}</h3>
          {section.questions.map((q) => (
            <QuestionField
              key={q.id}
              question={q}
              value={answers[q.id] || {}}
              onChange={(val) => {
                markEdited();
                setAnswers((prev) => ({ ...prev, [q.id]: val }));
              }}
              seriesTitle={seriesTitle}
              sessionTitle={sessionTitle}
              relatedDpIds={relatedDpIds}
            />
          ))}
        </section>
      ))}

      {consentSection ? (
        <div className="space-y-3 border-t border-slate-800 pt-6">
          {consentSection.questions.map((q) => (
            <QuestionField
              key={q.id}
              question={q}
              value={answers[q.id] || {}}
              onChange={(val) => {
                markEdited();
                setAnswers((prev) => ({ ...prev, [q.id]: val }));
              }}
              seriesTitle={seriesTitle}
              sessionTitle={sessionTitle}
              relatedDpIds={relatedDpIds}
            />
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void save(false)}
          disabled={saving}
          className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-slate-400 disabled:opacity-50"
        >
          Save draft
        </button>
        <button
          type="button"
          onClick={() => void save(true)}
          disabled={saving}
          className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
        >
          {status === 'submitted' ? 'Update submission' : 'Submit session questions'}
        </button>
        <Link
          href={`/series/${seriesSlug}`}
          className="rounded-lg px-4 py-2 text-sm text-cyan-300 hover:text-cyan-200"
        >
          ← Back to series
        </Link>
      </div>
    </div>
  );
}
