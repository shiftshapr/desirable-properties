import type { ComposeAiPromptOption } from '@/components/compose/ComposeFieldAiAssist';
import { COMPOSE_AI_INITIAL_PROMPTS } from '@/lib/compose-ai-prompts';
import type { HermesAmbientMode } from '@/lib/hermes-ambient-types';

/** Ask Hermes respond starter pills (private panel – nothing posts until user chooses). */
export const WORKGROUP_ASK_HERMES_PROMPTS: ComposeAiPromptOption[] = [
  { id: 'fit', label: 'Where might this fit among existing DPs?', requiresDraft: false },
  { id: 'new-dp', label: 'Should we consider a new DP?', requiresDraft: false },
  { id: 'compare', label: 'Compare to closest inscribed match', requiresDraft: false },
  { id: 'decision', label: "What's the decision we're actually making?", requiresDraft: false },
  { id: 'steelman', label: 'Steelman the opposite', requiresDraft: false },
  { id: 'summarize', label: 'Summarize for the room', requiresDraft: false },
];

export const WORKGROUP_ASK_HERMES_INSTRUCTIONS: Record<string, string> = {
  fit: 'Where might the topic under discussion fit among existing Desirable Properties? Name specific DPs and explain overlaps or gaps.',
  'new-dp': 'Should this workgroup consider proposing a new Desirable Property? What would it cover and how would it relate to existing DPs?',
  compare:
    'Compare the current discussion to the closest inscribed Desirable Property match. Note alignments, tensions, and what would need to change.',
  decision:
    'As a facilitator, clarify the actual decision this room is trying to make. Name options, stakeholders, and what would count as resolution.',
  steelman:
    "As devil's advocate, steelman the strongest opposite view to what's being discussed. Be fair and constructive.",
  summarize:
    'Summarize the thread for someone joining late: key claims, open questions, and where the group seems headed.',
};

/** Workgroup-specific assist chips appended to the standard compose starters. */
export function workgroupAssistPromptOptions(opts: {
  isDiscovery: boolean;
  dpId: string | null;
}): ComposeAiPromptOption[] {
  const { isDiscovery, dpId } = opts;
  const extras: ComposeAiPromptOption[] = [];

  if (isDiscovery) {
    extras.push(
      { id: 'wg-fit', label: 'Where might a new concept fit among the existing DPs?' },
      { id: 'wg-gaps', label: 'What gaps should we discuss first?' },
      { id: 'wg-reply', label: 'Help me draft a reply to the latest message.' },
    );
  } else if (dpId) {
    extras.push(
      { id: 'wg-summarize', label: `Summarize what ${dpId} means in one paragraph.` },
      { id: 'wg-reply', label: `Help me draft a reply about ${dpId}.` },
      { id: 'wg-tensions', label: `What tensions show up in ${dpId} discussions?` },
    );
  } else {
    extras.push(
      { id: 'wg-focus', label: 'Summarize what this workgroup should focus on.' },
      { id: 'wg-reply', label: 'Help me draft a reply to the latest message.' },
      { id: 'wg-next', label: 'What should we propose or patch next?' },
    );
  }

  return [...COMPOSE_AI_INITIAL_PROMPTS, ...extras];
}

export const WORKGROUP_ASSIST_INSTRUCTION_OVERRIDES: Record<string, string> = {
  start:
    'The composer is empty. Offer 2–3 short starter angles or reflective questions the participant could use in this workgroup chat.',
  dp: 'Connect this thinking to relevant Desirable Properties from the workgroup context.',
  'wg-fit': 'Where might a new concept fit among the existing Desirable Properties?',
  'wg-gaps': 'What gaps in the DP set should this workgroup discuss first?',
  'wg-reply': 'Help draft a reply to the latest message in the workgroup thread.',
  'wg-summarize': 'Summarize what this Desirable Property means in one clear paragraph.',
  'wg-tensions': 'What tensions or tradeoffs typically show up in discussions of this DP?',
  'wg-focus': 'Summarize what this workgroup should focus on right now.',
  'wg-next': 'What should this workgroup propose or patch next?',
};

export function buildAskHermesMessage(opts: {
  instruction: string;
  mode: HermesAmbientMode;
  contextBlock: string;
  userQuestion?: string;
}): string {
  const modeLine =
    opts.mode === 'facilitator'
      ? `Respond as Deepi in Facilitator mode: clarify decisions, surface options, keep the room moving.`
      : opts.mode === 'devils_advocate'
        ? "Respond as Deepi in Devil's advocate mode: steelman the opposite view fairly and constructively."
        : 'Respond as Deepi in Observer mode: observe the thread and offer grounded insight without taking sides.';

  return [
    'Workgroup Ask Deepi: private reply for the participant only.',
    modeLine,
    '',
    opts.contextBlock,
    '',
    '---',
    '',
    opts.userQuestion?.trim() ? `Participant question:\n${opts.userQuestion.trim()}\n\n---\n\n` : '',
    opts.instruction,
    '',
    'Reply in clear markdown. Be concise but substantive.',
  ]
    .filter(Boolean)
    .join('\n');
}
