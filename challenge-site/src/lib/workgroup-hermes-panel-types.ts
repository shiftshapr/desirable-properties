import type { HermesAmbientMode, HermesHand } from '@/lib/hermes-ambient-types';

/** Private Ask Hermes reply shown in the side panel (not persisted as an ambient hand). */
export type WorkgroupAskNote = {
  id: string;
  mode: HermesAmbientMode;
  reply: string;
  promptLabel: string;
  /** What the participant actually asked, shown alongside the reply when shared to the room. */
  question?: string;
  shared: boolean;
  createdAt: string;
};

export type WorkgroupHermesPanelSelection =
  | { type: 'hand'; handId: string }
  | { type: 'ask'; noteId: string };

export function panelItemLabel(item: HermesHand | WorkgroupAskNote): string {
  if ('triggerMessageId' in item) {
    return item.teaser?.slice(0, 60) || 'Raised hand';
  }
  return item.promptLabel;
}
