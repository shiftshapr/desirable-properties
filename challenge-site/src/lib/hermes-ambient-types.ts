/** Ambient Hermes types for workgroup chat. */

export type HermesAmbientMode = 'observer' | 'facilitator' | 'devils_advocate';

export type HermesDevilsAdvocatePolicy = 'request_only' | 'facilitator_enabled';

export type HermesHandStatus = 'raised' | 'opened' | 'shared' | 'dismissed';

export type HermesWorkgroupSettings = {
  workgroupId: string;
  confidenceThreshold: number;
  allowedModes: HermesAmbientMode[];
  cooldownMinutes: number;
  devilsAdvocateMode: HermesDevilsAdvocatePolicy;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type HermesHand = {
  id: string;
  workgroupId: string;
  communityThreadId: string | null;
  triggerMessageId: string;
  triggerMessageBody: string;
  triggerAuthorUserId: string;
  mode: HermesAmbientMode;
  status: HermesHandStatus;
  confidence: number;
  teaser: string;
  fullReply: string | null;
  requestedExplicitly: boolean;
  visibility: 'private' | 'shared';
  ownerUserId: string;
  sharedMessageId: string | null;
  createdAt: string;
  openedAt: string | null;
  sharedAt: string | null;
  dismissedAt: string | null;
};

export type HermesAmbientAssessInput = {
  messageId: string;
  messageBody: string;
  authorUserId: string;
  recentMessages: Array<{ id: string; author_name?: string; body: string }>;
  dpFocus?: number | null;
  workgroupSlug?: string;
};

export const DEFAULT_HERMES_WORKGROUP_SETTINGS: Omit<
  HermesWorkgroupSettings,
  'workgroupId' | 'updatedAt' | 'updatedBy'
> = {
  confidenceThreshold: 0.8,
  allowedModes: ['observer', 'facilitator'],
  cooldownMinutes: 15,
  devilsAdvocateMode: 'request_only',
};

export const HERMES_MODE_LABELS: Record<HermesAmbientMode, string> = {
  observer: 'Observer',
  facilitator: 'Facilitator',
  devils_advocate: "Devil's advocate",
};
