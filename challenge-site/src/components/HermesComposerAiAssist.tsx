'use client';

import ComposeFieldAiAssist, {
  type ComposeAiPromptOption,
} from '@/components/compose/ComposeFieldAiAssist';
import {
  COMPOSE_AI_INITIAL_PROMPTS,
  COMPOSE_AI_REFINEMENTS,
  COMPOSE_AI_STRENGTHEN,
  buildComposeAiMessage,
  composeAiInstruction,
  fetchComposeAiResponse,
} from '@/lib/compose-ai-prompts';
import type { RefObject } from 'react';

type Props = {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onValueChange: (next: string) => void;
  surface?: string;
  dpFocus?: number | null;
  threadId?: string | null;
  disabled?: boolean;
  onSendResponse?: (text: string) => void;
};

export default function HermesComposerAiAssist({
  textareaRef,
  value,
  onValueChange,
  surface = 'desirableproperties.org/agent',
  dpFocus = null,
  threadId = null,
  disabled,
  onSendResponse,
}: Props) {
  async function generate(
    option: ComposeAiPromptOption,
    context: { draft: string; selection: string },
    signal: AbortSignal,
  ): Promise<string> {
    const userDraft = context.selection.trim() || context.draft.trim();
    const instruction = composeAiInstruction(option, {
      dp: 'Connect this thinking to relevant Desirable Properties.',
      start:
        'The composer is empty. Offer 2–3 short starter questions or angles the user could ask Deepi about Desirable Properties.',
    });
    const message = buildComposeAiMessage({
      contextLines: [
        'Deepi chat – help refine my message before I send it.',
        dpFocus ? `DP focus: DP${dpFocus}` : '',
      ],
      userDraft,
      instruction,
    });

    return fetchComposeAiResponse({
      message,
      surface,
      dpFocus,
      threadId,
      skipMemoryRecord: !threadId,
      signal,
    });
  }

  return (
    <ComposeFieldAiAssist
      textareaRef={textareaRef}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      mode="chatReply"
      fabAlign="right"
      onSendResponse={onSendResponse}
      promptOptions={COMPOSE_AI_INITIAL_PROMPTS}
      refinementOptions={[...COMPOSE_AI_REFINEMENTS, COMPOSE_AI_STRENGTHEN]}
      onGenerate={generate}
      fieldLabel="message"
    />
  );
}
