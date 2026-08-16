import type { ComposeAiPromptOption } from '@/components/compose/ComposeFieldAiAssist';

export const BROADCAST_AI_PROMPTS: ComposeAiPromptOption[] = [
  { id: 'start', label: 'Help me get started', requiresDraft: false },
  { id: 'clarify', label: 'Clarify the message' },
  { id: 'expand', label: 'Expand' },
  { id: 'shorter', label: 'Shorter version' },
  { id: 'strengthen', label: 'Strengthen for send' },
];

export const BROADCAST_AI_INSTRUCTIONS: Record<string, string> = {
  start:
    'The broadcast field is empty. Suggest 2–3 subject line options and a short opening paragraph outline for a community email.',
  clarify: 'Clarify and sharpen the broadcast copy. Keep merge tags like {name} and {workgroups} when present.',
  expand: 'Expand with useful detail while staying readable in email.',
  shorter: 'Produce a shorter version that keeps the core message.',
  strengthen:
    'Strengthen for a professional community broadcast. Mention Desirable Properties / governance only when relevant.',
};

export const BROADCAST_AI_SURFACE = 'desirableproperties.org/admin/broadcast';

export function htmlToPlainBroadcast(html: string): string {
  if (!html) return '';
  return String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function plainToBroadcastHtml(text: string): string {
  const trimmed = String(text || '').trim();
  if (!trimmed) return '';
  const paragraphs = trimmed.split(/\n{2,}/);
  return paragraphs
    .map((p) => {
      const escaped = p
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      const withBreaks = escaped.replace(/\n/g, '<br>');
      return `<p>${withBreaks}</p>`;
    })
    .join('');
}
