import type { ComposeAiPromptOption } from '@/components/compose/ComposeFieldAiAssist';

/** Standard post-generation refinements (Expand, Clarify, Shorter, etc.). */
export const COMPOSE_AI_REFINEMENTS: ComposeAiPromptOption[] = [
  { id: 'clarify', label: 'Clarify' },
  { id: 'expand', label: 'Expand' },
  { id: 'shorter', label: 'Shorter' },
];

export const COMPOSE_AI_STRENGTHEN: ComposeAiPromptOption = {
  id: 'strengthen',
  label: 'Strengthen',
};

/** Initial AI assist chips for session forms and Hermes chat composer. */
export const COMPOSE_AI_INITIAL_PROMPTS: ComposeAiPromptOption[] = [
  { id: 'start', label: 'Help me get started', requiresDraft: false },
  { id: 'clarify', label: 'Clarify my thinking' },
  { id: 'expand', label: 'Expand' },
  { id: 'dp', label: 'Connect to a Desirable Property' },
  { id: 'strengthen', label: 'Strengthen for submission' },
  { id: 'shorter', label: 'Shorter version' },
];

/** Plain-prose guard for compose-assist model calls (belt-and-suspenders with insert-time stripping). */
export const COMPOSE_AI_PLAIN_PROSE_RULE =
  'Return plain prose only. Do not use markdown formatting (no **bold**, *italic*, headings, blockquotes, or bullet lists).';

export const COMPOSE_AI_REFINEMENT_INSTRUCTIONS: Record<string, string> = {
  start:
    'The field is empty. Offer 2–3 short starter angles, reflective questions, or example opening sentences the participant could build on. Do not write a full polished answer. Help them begin.',
  clarify: 'Clarify and sharpen the ideas in the draft. Ask one reflective question if helpful.',
  expand:
    "Expand the draft with supporting detail and examples. Stay on topic and in the participant's voice.",
  dp: 'Connect this thinking to relevant Desirable Properties from the session context.',
  strengthen: 'Strengthen this draft for submission: be specific, concrete, and honest.',
  shorter: 'Produce a shorter version that keeps the core insight.',
};

export function composeAiInstruction(
  option: ComposeAiPromptOption,
  overrides?: Record<string, string>,
): string {
  return overrides?.[option.id] ?? COMPOSE_AI_REFINEMENT_INSTRUCTIONS[option.id] ?? option.label;
}

export function buildComposeAiMessage(options: {
  instruction: string;
  userDraft: string;
  contextLines?: string[];
}): string {
  const { instruction, userDraft, contextLines = [] } = options;
  const header = contextLines.filter(Boolean);
  return [
    ...header,
    header.length ? '' : null,
    userDraft
      ? `Current draft:\n${userDraft}\n\n---\n\n`
      : 'The field is currently empty.\n\n---\n\n',
    instruction,
    '',
    COMPOSE_AI_PLAIN_PROSE_RULE,
  ]
    .filter((line) => line !== null)
    .join('\n');
}

export async function fetchComposeAiResponse(options: {
  message: string;
  surface: string;
  dpFocus?: number | null;
  signal?: AbortSignal;
}): Promise<string> {
  const res = await fetch('/api/agent/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: options.message,
      history: [],
      surface: options.surface,
      dpFocus: options.dpFocus ?? undefined,
    }),
    signal: options.signal,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'AI request failed');
  return data.response || '';
}
