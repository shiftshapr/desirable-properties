'use client';

import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import ComposeFieldAiAssist, {
  type ComposeAiPromptOption,
} from '@/components/compose/ComposeFieldAiAssist';
import {
  BROADCAST_AI_INSTRUCTIONS,
  BROADCAST_AI_PROMPTS,
  BROADCAST_AI_SURFACE,
  htmlToPlainBroadcast,
  plainToBroadcastHtml,
} from '@/lib/broadcast-ai-prompts';
import {
  COMPOSE_AI_REFINEMENTS,
  buildComposeAiMessage,
  composeAiInstruction,
  fetchComposeAiResponse,
} from '@/lib/compose-ai-prompts';

type FieldProps = {
  label: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  field: 'subject' | 'body';
  subjectForContext?: string;
  showFabWhen?: 'focused' | 'always';
  children?: ReactNode;
};

function BroadcastFieldAiAssist({
  label,
  value,
  onChange,
  disabled,
  field,
  subjectForContext,
  showFabWhen = 'focused',
  children,
}: FieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bodyPlain = field === 'body' ? value : '';

  useEffect(() => {
    if (field !== 'body' || !textareaRef.current) return;
    if (textareaRef.current.value !== bodyPlain) {
      textareaRef.current.value = bodyPlain;
    }
  }, [bodyPlain, field]);

  const onGenerate = useCallback(
    async (
      option: ComposeAiPromptOption,
      context: { draft: string; selection: string },
      signal: AbortSignal,
    ) => {
      const instruction = composeAiInstruction(option, BROADCAST_AI_INSTRUCTIONS);
      const contextLines = [
        'You are helping draft a broadcast email for the Desirable Properties community.',
        'Available merge tags: {name}, {userName}, {profileLink}, {workgroups}.',
        field === 'body' && subjectForContext
          ? `Email subject: ${subjectForContext}`
          : null,
        field === 'subject'
          ? 'Field: email subject line (keep under ~120 characters if possible).'
          : 'Field: email body (plain text; paragraphs separated by blank lines).',
      ].filter(Boolean) as string[];

      const message = buildComposeAiMessage({
        instruction,
        userDraft: context.draft,
        contextLines,
      });

      return fetchComposeAiResponse({
        message,
        surface: BROADCAST_AI_SURFACE,
        signal,
      });
    },
    [field, subjectForContext],
  );

  return (
    <div className="relative">
      <label className="block text-sm text-slate-300">{label}</label>
      {field === 'subject' ? (
        <textarea
          ref={textareaRef}
          rows={1}
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 pb-10 text-sm text-white"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Subject"
        />
      ) : (
        <div className="mt-1">
          {children}
          <textarea
            ref={textareaRef}
            tabIndex={-1}
            aria-hidden="true"
            className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
            value={bodyPlain}
            readOnly
          />
        </div>
      )}
      <ComposeFieldAiAssist
        textareaRef={textareaRef}
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        promptOptions={BROADCAST_AI_PROMPTS}
        refinementOptions={COMPOSE_AI_REFINEMENTS}
        onGenerate={onGenerate}
        fieldLabel={label}
        showFabWhen={showFabWhen}
      />
    </div>
  );
}

type Props = {
  subject: string;
  onSubjectChange: (next: string) => void;
  html: string;
  onHtmlChange: (next: string) => void;
  disabled?: boolean;
  children: ReactNode;
};

export default function BroadcastComposeAssist({
  subject,
  onSubjectChange,
  html,
  onHtmlChange,
  disabled,
  children,
}: Props) {
  const bodyPlain = htmlToPlainBroadcast(html);

  return (
    <div className="grid gap-3">
      <BroadcastFieldAiAssist
        label="Subject"
        field="subject"
        value={subject}
        onChange={onSubjectChange}
        disabled={disabled}
      />
      <BroadcastFieldAiAssist
        label="Body"
        field="body"
        value={bodyPlain}
        onChange={(plain) => onHtmlChange(plainToBroadcastHtml(plain))}
        disabled={disabled}
        subjectForContext={subject}
        showFabWhen="always"
      >
        {children}
      </BroadcastFieldAiAssist>
    </div>
  );
}
